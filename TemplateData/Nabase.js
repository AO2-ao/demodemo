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
    createAudioContext();
    generateLisner();
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
    });
    room.on("peerJoin", (peerId) => {
      myGameInstance.SendMessage('JSHandle','InitIconOther',peerId);
      });
    room.on("stream", (stream) => {
      const id=stream.peerId;
      storePeerStream(stream,id);
      addAudioTrackasPannertoContext(stream,id);
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

          //unityInstance.SendMessage("JSHandle","",device.label);
        }else if(kind=='videoinput'){
          myMediaDeviceInfoVideo[device.label]=device;
          //unityInstance.SendMessage("JSHandle","",device.label);
        }
      });
    })
    .catch((err) => {
      console.log(`${err.name}: ${err.message}`);
    });
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
  console.log("Nabase: js側でreplace 関数の実行開始\nid "+id);
  const newVideoTrack= videoTrackMap[id];
  console.log("Nabase: newvideotrackの取得");
      const newStream=new MediaStream();
      if(newVideoTrack){
        newStream.addTrack(newVideoTrack);
        console.log("Nabase: addTrack");
      }else{
        console.log("ビデオトラックが見つかりません");
      }
    const remoteVideo = document.getElementById('js-video-stream');
    console.log("Nabase: remoteViceoの取得");
      remoteVideo.srcObject = newStream;
    console.log("Nabase: remoteVideo srcObjectの変更");
      remoteVideo.playsInline = true;
      console.log("Nabase: remoteVideo playsInlineの変更");
      try {
        await remoteVideo.play();
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
/*async function addAudioElement(id){
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
}*/

//立体音響関係
//コンテキスト作成
let audioContext
function createAudioContext(){
  audioContext=new AudioContext();
}
//コンテキストの追加と連想配列への追加
const SoucePannerMap={};
function addAudioTrackasPannertoContext(stream,id){
  console.log(("Nabase: addAudioTrackasPannertoContextの実行\n id "+ id));
  //const track=audioTrackMap[id];
  /*const panner = audioContext.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'linear';
  panner.refDistance = 1.0; // 減衰が始まる距離
  panner.maxDistance = 1000.0; // 最大減衰距離*/

  //const newStream = new MediaStream(); // must be an array
  //newStream.addTrack(track);
  const sourceNode = audioContext.createMediaStreamSource(stream);
  //sourceNode.connect(panner);
  //panner.connect(audioContext.destination);
  sourceNode.connect(audioContext.destination);
  //console.log("Nabase: panner.context.destination\n"+panner.context.destination);
  // 連想配列にPannerNodeとAudioTrackを保存
 /* SoucePannerMap[id] = {
    panner: panner,
    sourceNode: sourceNode
}*/
  //console.log("Nabase: SoucePannerMap[id].panner.context.destination\n"+SoucePannerMap[id].panner.context.destination);
}
function updatePannerNode(id, x, y) {
  if(SoucePannerMap[id]!=undefined&&SoucePannerMap[id]!=null){
    SoucePannerMap[id].panner.positionX.setValueAtTime(x, audioContext.currentTime);
    SoucePannerMap[id].panner.positionY.setValueAtTime(y, audioContext.currentTime);
    SoucePannerMap[id].panner.positionZ.setValueAtTime(0, audioContext.currentTime);
  }else{
    console.log("Nabase: pannerが見つかりません");
  }
}
let Listener
function generateLisner(){
  Listener = audioContext.listener;
  console.log("Nabse: generateListenerの実行");
console.log("listener != undefined: " + (Listener != undefined));
console.log("listener != null: " + (Listener != null));
}
function updateLisnerNode(pos_x,pos_y,ang_x,ang_y){
  if(Listener!=null&&Listener!=undefined){
  Listener.positionX.setValueAtTime(pos_x, audioContext.currentTime);
  Listener.positionY.setValueAtTime(pos_y, audioContext.currentTime);
  Listener.positionZ.setValueAtTime(0, audioContext.currentTime);
  Listener.forwardX.setValueAtTime(ang_x, audioContext.currentTime);
  Listener.forwardY.setValueAtTime(ang_y, audioContext.currentTime);
  Listener.forwardZ.setValueAtTime(0, audioContext.currentTime);
  }else{
    console.log("Nabase: listenerが見つからない");
  }
}
//リスナーを削除したりpannerを削除するのが必要
