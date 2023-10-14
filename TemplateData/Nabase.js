//グローバル変数の宣言、代入
//変数のスコープがややこしくなるので、ここにはできるだけ処理を書かない

//今すぐ実行する処理
(function() {

}());

//DOMツリーが出来上がったら実行※画像読み込み前

document.addEventListener('DOMContentLoaded', async function() {
});

//最後に実行※画像読み込み後
window.onload = async function() {
    await initializePeer();
    await accsecVideoMicrophone();
    await storeDevicesInfo();
    //createAudioContext();
    
};
//peer作成
let peer;
async function initializePeer() {
  return new Promise((resolve, reject) => {
        peer = new Peer({
          key: 'f1b2a635-fca4-4150-8104-d54dfeaec4bd',
          debug: 3
      });

      peer.on('open', (id) => {
          console.log('Peer ID:', id);
          resolve(peer); // Peerが正常に初期化されたらresolveする
      });

      peer.on('error', (error) => {
          console.error('Error:', error);
          reject(error); // エラーが発生したらrejectする
      });
  });
}

//ルームに入って、いろいろの処理
let room;
function joinRoomHoge(){
    room=peer.joinRoom("hoge",{mode: 'sfu',stream: localStream});
    room.on("open", () => {
      room.members.forEach(peerid => {
        if(peerid!=peer.id){
          myGameInstance.SendMessage('JSHandle','InitIconOther',peerid);
        }
      });
      newContextAndListener();
    });
    room.on("peerJoin", (peerId) => {
      myGameInstance.SendMessage('JSHandle','InitIconOther',peerId);
      });
    room.on("stream", async (stream) => {
      const id=stream.peerId;
      storePeerStream(stream,id);
      await addAudioContext(stream,id);
      //addAudioElement(id)
      //addAudioTrackasPannertoContext(id);
    });
    room.on("data", ({ src, data }) => {
      const obj = JSON.parse(data);
      if(obj.image[0]==0){
        const positon =JSON.stringify({ x: obj.x, y: obj.y,id: src});
        myGameInstance.SendMessage('JSHandle','MoveOtherIcon',positon); 
      }else{

      }
      });
}
//ポジションを送信
function sendPosition(data){
  room.send(data);
}
//テクスチャを送信
function sendTexture(data){
  room.send(data);
}

//カメラとマイクにアクセス
let localStream
async function accsecVideoMicrophone(){
    const remoteVideo = document.getElementById('js-video-stream');
    await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then((stream) => {
        localStream=stream;
        remoteVideo.srcObject=localStream;
        remoteVideo.playsInline=true;
        remoteVideo.muted=true;
        remoteVideo.play().catch(console.error);
        VideoHide();
      })
    .catch(console.error)

}
//リストにデバイス情報を格納する
//同時にlabelをC#に送る
const myMediaDeviceInfoAudio={};
const myMediaDeviceInfoVideo={};
async function storeDevicesInfo(){
  await navigator.mediaDevices
    .enumerateDevices()
    .then((devices) => {
      devices.forEach(device => {
        const kind=device.kind;
        if(kind=='audioinput'){

          myMediaDeviceInfoAudio[device.label]=device;

          //もしかしたらunity.
          /*let sendStr=device.label;
          let bufferSize=lengthBytesUTF8(sendStr)+1;
          let buffer=_malloc(bufferSize);
          stringToUTF8(sendStr,buffer,bufferSize);*/
          myGameInstance.SendMessage("JSHandle","AddAudiolabel",device.label);
        }else if(kind=='videoinput'){
          myMediaDeviceInfoVideo[device.label]=device;
          myGameInstance.SendMessage("JSHandle","AddVideolabel",device.label);
        }
      });
    })
    .catch((err) => {
      console.log(`${err.name}: ${err.message}`);
    });
}

async function replaceLocalStream(videoName,audioName){
  const remoteVideo = document.getElementById('js-video-stream');
  if(videoName!='Display'){
    await navigator.mediaDevices
    .getUserMedia({
      audio: myMediaDeviceInfoAudio[audioName],
      video: myMediaDeviceInfoVideo[videoName],
    })
    .then((stream) => {
        localStream=stream;
        remoteVideo.srcObject=localStream;
        remoteVideo.playsInline=true;
        remoteVideo.muted=true;
        remoteVideo.play().catch(console.error);
      })
    .catch(console.error)
  }else{
    await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: true,
    }).then((stream) => {
      localStream=stream;
      remoteVideo.srcObject=localStream;
      remoteVideo.playsInline=true;
      remoteVideo.muted=true;
      remoteVideo.play().catch(console.error);
    })
  .catch(console.error)
  }
}

//video,auidioをpeerIdごとに管理
//各peerのvideoを格納する連想配列
const videoTrackMap={};
const audioTrackMap={};
function storePeerStream(stream,id){
      console.log("Nabase: storePeerStreamの実行\n id "+id);
      videoTrackMap[id]=stream.getVideoTracks()[0];
      audioTrackMap[id]=stream.getAudioTracks()[0];
}
//video要素に対する処理
//ビデオ切り替え
async function ReplaceVideoTrack(id){
  const newVideoTrack= videoTrackMap[id];
      const newStream=new MediaStream();
      if(newVideoTrack){
        newStream.addTrack(newVideoTrack);
      }else{
        console.log("ビデオトラックが見つかりません");
      }
    const remoteVideo = document.getElementById('js-video-stream');
      remoteVideo.srcObject = newStream;
      remoteVideo.playsInline = true;
      try {
        await remoteVideo.play();
        remoteVideo.muted=true;
        VideoVisible();
        console.log("再生成功");
    } catch (error) {
        console.error("再生エラー: ", error);
    }
}

//非表示
function VideoHide(){
  const videImage=document.getElementById("js-video-stream");
  videImage.style.visibility="hidden";
}
//表示
function VideoVisible(){
  const videImage=document.getElementById("js-video-stream");
  videImage.style.visibility="visible";
}
//audio要素に対する処理
//audio要素を追加する
async function addAudioElement(id){
  console.log("Nabase: addAudioElement の実行\n id "+id);
  const remoteAudio=document.getElementById("js-audio-stream");
  const newAudio = document.createElement('audio');
  const addAudioTrack=audioTrackMap[id];
  const addAudioStream=new MediaStream();
  if(addAudioTrack){
    addAudioStream.addTrack(addAudioTrack);
  }else{
    console.log("ビデオトラックが見つかりません");
  }
  newAudio.srcObject=addAudioStream;
  remoteAudio.append(newAudio);
  await newAudio.play().catch(console.error);
}


//立体音響関係
const PannerMap={};
let Listener;
let AudioContext_nabe;

function newContextAndListener(){
  console.log("Nabase: newContextAndListenerの呼び出し");
  //新しいコンテキスト
  AudioContext_nabe=new AudioContext();
  //リスナー
  Listener=AudioContext_nabe.listener;
  Listener.upX.setValueAtTime(0, AudioContext_nabe.currentTime);
  Listener.upY.setValueAtTime(1, AudioContext_nabe.currentTime);
  Listener.upZ.setValueAtTime(0, AudioContext_nabe.currentTime);
  Listener.forwardX.setValueAtTime(0, AudioContext_nabe.currentTime);
  Listener.forwardY.setValueAtTime(0, AudioContext_nabe.currentTime);
  Listener.forwardZ.setValueAtTime(-1, AudioContext_nabe.currentTime);
}

async function addAudioContext(stream,id){
  console.log("Nabase: addAudioContext");
  //音源の追加
  const souce=AudioContext_nabe.createMediaStreamSource(stream);
  //フィルターの作成
  //パンナー
  PannerMap[id]=new PannerNode(AudioContext_nabe,{
    panningModel: "HRTF",
    distanceModel: "linear",
    refDistance: 1,
    maxDistance: 50,
    rolloffFactor: 1,
    coneInnerAngle: 360,
    coneOuterAngle: 0,
    coneOuterGain: 0,
  });
  
  //gain
  const gain=AudioContext_nabe.createGain();
   // 音声を再生
   await souce.mediaStream.getTracks().forEach(track => {
    if (track.kind === 'audio') {
        track.enabled = true;
    }
});
  //つなげる
  souce.connect(PannerMap[id]).connect(gain).connect(AudioContext_nabe.destination);
  // 音声再生を追加
  const audioElement = new Audio();
  audioElement.srcObject = stream;
  await audioElement.play().catch(console.error);
}

function updatePannerNode(id, x, z) {
  if(PannerMap[id]!=undefined&&PannerMap[id]!=null){
    PannerMap[id].positionX.setValueAtTime(x, AudioContext_nabe.currentTime);
    PannerMap[id].positionY.setValueAtTime(0, AudioContext_nabe.currentTime);
    PannerMap[id].positionZ.setValueAtTime(z, AudioContext_nabe.currentTime);
    console.log("Nabase: x"+PannerMap[id].positionX.value);
    console.log("Nabase: z"+PannerMap[id].positionZ.value);
  }else{
    console.log("Nabase: pannerが見つかりません");
  }
}
function updateLisnerNode(pos_x,pos_z,ang_x,ang_z){
  
  if(Listener!=null&&Listener!=undefined){
  Listener.positionX.setValueAtTime(pos_x, AudioContext_nabe.currentTime);
  Listener.positionY.setValueAtTime(0, AudioContext_nabe.currentTime);
  Listener.positionZ.setValueAtTime(pos_z, AudioContext_nabe.currentTime);
  Listener.forwardX.setValueAtTime(ang_x, AudioContext_nabe.currentTime);
  Listener.forwardY.setValueAtTime(0, AudioContext_nabe.currentTime);
  Listener.forwardZ.setValueAtTime(ang_z, AudioContext_nabe.currentTime);
  console.log("Nabase: posx value:"+Listener.positionX.value);
  console.log("Nabase: posz value:"+Listener.positionZ.value);
  console.log("Nabase: angx value:"+Listener.forwardX.value);
  console.log("Nabase: angz value:"+Listener.forwardZ.value);
  }else{
    console.log("Nabase: listenerが見つからない");
    console.log(Listener);
  }
}

let isMuted=false;
function switchMuted(){
  if(!isMuted){
    localStream.getAudioTracks().forEach((track) => (track.enabled = false));
    isMuted=true;
  }else{
    localStream.getAudioTracks().forEach((track) => (track.enabled = true))
    isMuted=false;
  }
}
//※リスナーを削除したりpannerを削除するのが必要
