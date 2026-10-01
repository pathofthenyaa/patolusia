/* Patolusia shared multiplayer transport v1
 * v3 room API + WebRTC/STUN with automatic WebSocket relay fallback.
 * Plain script: window.PatolusiaConnect
 */
(()=>{
'use strict';

const DEFAULT_SIGNAL='https://patolusia.margoth.workers.dev';
const ICE_SERVERS=[{urls:'stun:stun.cloudflare.com:3478'}];

class PatolusiaConnect{
  constructor(opts={}){
    this.signalUrl=(opts.signalUrl||DEFAULT_SIGNAL).replace(/\/$/,'');
    this.game=String(opts.game||'generic');
    this.maxPlayers=Math.max(2,Math.min(4,Number(opts.maxPlayers)||4));
    this.onPresence=opts.onPresence||(()=>{});
    this.onMessage=opts.onMessage||(()=>{});
    this.onStatus=opts.onStatus||(()=>{});
    this.onRoomStarted=opts.onRoomStarted||(()=>{});
    this.onTransport=opts.onTransport||(()=>{});

    this.code='';
    this.token='';
    this.playerId='';
    this.playerNumber=0;
    this.isHost=false;
    this.started=false;
    this.players=[];
    this.ws=null;
    this.peers=new Map();
    this.closed=false;
    this.reconnectTimer=null;
    this.heartbeat=null;
    this._welcomeResolve=null;
    this._welcomeReject=null;
  }

  async _api(path,opt={}){
    const r=await fetch(this.signalUrl+path,{cache:'no-store',...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});
    let d={};try{d=await r.json()}catch{}
    if(!r.ok||d.ok===false){const e=new Error(d.error||('HTTP '+r.status));e.code=d.error||('HTTP_'+r.status);throw e}
    return d;
  }

  _wsUrl(){
    const base=this.signalUrl.replace(/^http:/,'ws:').replace(/^https:/,'wss:');
    return `${base}/v3/ws?code=${encodeURIComponent(this.code)}&token=${encodeURIComponent(this.token)}`;
  }

  async createRoom(){
    this.close(false);
    this.closed=false;
    const d=await this._api('/v3/create',{method:'POST',body:JSON.stringify({game:this.game,maxPlayers:this.maxPlayers})});
    this.code=String(d.code);this.token=d.hostToken;this.playerId=d.playerId;this.playerNumber=d.playerNumber;this.maxPlayers=d.maxPlayers;this.isHost=true;
    await this._connectSocket(true);
    return {code:this.code,playerId:this.playerId,playerNumber:this.playerNumber,maxPlayers:this.maxPlayers};
  }

  async joinRoom(code){
    this.close(false);
    this.closed=false;
    const d=await this._api('/v3/join',{method:'POST',body:JSON.stringify({code:String(code)})});
    this.code=String(code);this.token=d.token;this.playerId=d.playerId;this.playerNumber=d.playerNumber;this.maxPlayers=d.maxPlayers;this.isHost=false;this.started=!!d.started;
    await this._connectSocket(true);
    return {code:this.code,playerId:this.playerId,playerNumber:this.playerNumber,maxPlayers:this.maxPlayers};
  }

  async startRoom(){
    if(!this.isHost)throw new Error('HOST_ONLY');
    const d=await this._api('/v3/start',{method:'POST',body:JSON.stringify({code:this.code,token:this.token})});
    this.started=true;
    return d;
  }

  async status(){
    return this._api(`/v3/status?code=${encodeURIComponent(this.code)}&token=${encodeURIComponent(this.token)}`);
  }

  connectedPlayers(){return this.players.filter(p=>p.connected)}
  playerNumberOf(id){return this.players.find(p=>p.playerId===id)?.playerNumber||0}
  playerIdForNumber(n){return this.players.find(p=>p.playerNumber===n)?.playerId||null}
  transportFor(id){return this.peers.get(id)?.dc?.readyState==='open'?'p2p':'relay'}

  _connectSocket(initial=false){
    if(this.closed||!this.code||!this.token)return Promise.reject(new Error('NO_ROOM'));
    if(this.ws&&(this.ws.readyState===WebSocket.OPEN||this.ws.readyState===WebSocket.CONNECTING))return Promise.resolve();
    clearTimeout(this.reconnectTimer);
    const ws=new WebSocket(this._wsUrl());this.ws=ws;
    this.onStatus({state:'connecting',transport:'websocket'});

    let initialPromise=Promise.resolve();
    if(initial){
      initialPromise=new Promise((resolve,reject)=>{this._welcomeResolve=resolve;this._welcomeReject=reject});
      setTimeout(()=>{if(this._welcomeReject){const r=this._welcomeReject;this._welcomeResolve=this._welcomeReject=null;r(new Error('WS_TIMEOUT'))}},10000);
    }

    ws.onopen=()=>{
      this.onStatus({state:'connected',transport:'websocket'});
      clearInterval(this.heartbeat);
      this.heartbeat=setInterval(()=>{try{if(this.ws?.readyState===WebSocket.OPEN)this.ws.send('ping')}catch{}},25000);
    };
    ws.onmessage=e=>this._onWsMessage(e.data);
    ws.onerror=()=>this.onStatus({state:'error',transport:'websocket'});
    ws.onclose=()=>{
      clearInterval(this.heartbeat);this.heartbeat=null;
      if(this._welcomeReject){const r=this._welcomeReject;this._welcomeResolve=this._welcomeReject=null;r(new Error('WS_CLOSED'))}
      this.onStatus({state:'disconnected',transport:'websocket'});
      if(!this.closed)this.reconnectTimer=setTimeout(()=>this._connectSocket(false).catch(()=>{}),1200);
    };
    return initialPromise;
  }

  _sendWs(obj){
    if(this.ws?.readyState!==WebSocket.OPEN)return false;
    try{this.ws.send(JSON.stringify(obj));return true}catch{return false}
  }

  _onWsMessage(raw){
    if(raw==='pong')return;
    let m;try{m=JSON.parse(raw)}catch{return}
    if(m.kind==='system'){
      if(m.type==='welcome'){
        this.playerId=m.playerId;this.playerNumber=m.playerNumber;this.started=!!m.started;this.maxPlayers=m.maxPlayers;this.players=m.players||[];
        const resolve=this._welcomeResolve;this._welcomeResolve=this._welcomeReject=null;if(resolve)resolve(m);
        this.onPresence(this.players,m);
        if(this.isHost)this._ensureHostPeers();
      }else if(m.type==='presence'){
        this.started=!!m.started;this.players=m.players||[];this.onPresence(this.players,m);
        if(this.isHost)this._ensureHostPeers();
      }else if(m.type==='started'){
        this.started=true;this.players=m.players||this.players;this.onPresence(this.players,m);this.onRoomStarted(m);
      }
      return;
    }
    if(m.kind==='signal'){this._handleSignal(m.from,m.data);return}
    if(m.kind==='relay'){this.onMessage(m.data,m.from,'relay')}
  }

  _peer(id){return this.peers.get(id)||null}
  _newPeer(id){
    this._closePeer(id);
    const pc=new RTCPeerConnection({iceServers:ICE_SERVERS,iceCandidatePoolSize:2});
    const peer={id,pc,dc:null,pending:[],offered:false};this.peers.set(id,peer);
    pc.onicecandidate=e=>{if(e.candidate)this._signal(id,{type:'ice',candidate:e.candidate.toJSON?e.candidate.toJSON():e.candidate})};
    pc.onconnectionstatechange=()=>{
      const st=pc.connectionState;
      if(st==='failed'||st==='closed')this.onTransport({playerId:id,transport:'relay',state:st});
    };
    return peer;
  }
  _closePeer(id){
    const p=this.peers.get(id);if(!p)return;
    try{p.dc?.close()}catch{}try{p.pc?.close()}catch{}this.peers.delete(id);
  }
  _wireChannel(id,dc){
    const p=this.peers.get(id)||this._newPeer(id);p.dc=dc;
    dc.onopen=()=>this.onTransport({playerId:id,transport:'p2p',state:'open'});
    dc.onclose=()=>this.onTransport({playerId:id,transport:'relay',state:'fallback'});
    dc.onerror=()=>this.onTransport({playerId:id,transport:'relay',state:'fallback'});
    dc.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}this.onMessage(m?.data??m,id,'p2p')};
  }
  _signal(to,data){this._sendWs({kind:'signal',to,data})}

  _ensureHostPeers(){
    if(!this.isHost)return;
    const wanted=new Set(this.players.filter(p=>p.connected&&p.playerId!==this.playerId).map(p=>p.playerId));
    for(const id of [...this.peers.keys()])if(!wanted.has(id))this._closePeer(id);
    for(const id of wanted){
      if(this.peers.has(id))continue;
      const p=this._newPeer(id),dc=p.pc.createDataChannel('patolusia');this._wireChannel(id,dc);
      this._offer(id,p).catch(()=>this.onTransport({playerId:id,transport:'relay',state:'offer-failed'}));
    }
  }

  async _offer(id,p){
    await p.pc.setLocalDescription(await p.pc.createOffer());p.offered=true;
    this._signal(id,{type:'offer',description:p.pc.localDescription});
  }

  async _handleSignal(from,data){
    if(!from||!data?.type)return;
    try{
      if(data.type==='offer'&&!this.isHost){
        let p=this._peer('host');if(!p)p=this._newPeer('host');
        p.pc.ondatachannel=e=>this._wireChannel('host',e.channel);
        await p.pc.setRemoteDescription(data.description);
        for(const c of p.pending.splice(0))await p.pc.addIceCandidate(c);
        await p.pc.setLocalDescription(await p.pc.createAnswer());
        this._signal('host',{type:'answer',description:p.pc.localDescription});
        return;
      }
      const id=this.isHost?from:'host';let p=this._peer(id);
      if(!p&&data.type==='ice')p=this._newPeer(id);
      if(!p)return;
      if(data.type==='answer'&&this.isHost){
        await p.pc.setRemoteDescription(data.description);
        for(const c of p.pending.splice(0))await p.pc.addIceCandidate(c);
      }else if(data.type==='ice'&&data.candidate){
        if(p.pc.remoteDescription)await p.pc.addIceCandidate(data.candidate);else p.pending.push(data.candidate);
      }
    }catch{this.onTransport({playerId:from,transport:'relay',state:'signal-failed'})}
  }

  _sendTo(id,data){
    const p=this.peers.get(id);
    if(p?.dc?.readyState==='open'){
      try{p.dc.send(JSON.stringify({data}));return 'p2p'}catch{}
    }
    if(this._sendWs({kind:'relay',to:id,data}))return 'relay';
    return null;
  }

  send(data){
    if(this.isHost)throw new Error('HOST_USE_SENDTO_OR_BROADCAST');
    return this._sendTo('host',data);
  }
  sendTo(playerId,data){
    if(!this.isHost)throw new Error('HOST_ONLY');
    return this._sendTo(playerId,data);
  }
  broadcast(data){
    if(!this.isHost)throw new Error('HOST_ONLY');
    const result={};
    for(const p of this.connectedPlayers())if(p.playerId!==this.playerId)result[p.playerId]=this._sendTo(p.playerId,data);
    return result;
  }

  close(clearRoom=true){
    this.closed=true;clearTimeout(this.reconnectTimer);clearInterval(this.heartbeat);this.reconnectTimer=this.heartbeat=null;
    for(const id of [...this.peers.keys()])this._closePeer(id);
    try{this.ws?.close(1000,'Client closed')}catch{}this.ws=null;
    if(clearRoom){this.code='';this.token='';this.playerId='';this.playerNumber=0;this.players=[];this.started=false;this.isHost=false}
  }
}

window.PatolusiaConnect=PatolusiaConnect;
})();
