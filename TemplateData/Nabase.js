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
    room.on("peerJoin", (peerId) => {
      myGameInstance.SendMessage('JSHandle','InitIconOther',peerId);
      });
      room.on("stream", (stream) => {
        const id=stream.peerid;
        storePeerStream(stream,id);
        ReplaceVideoTrack(id);
        addAudioElement(id);
      });
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
      console.log(id);
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
      await remoteVideo.play().catch(console.error);
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
  console.log("add audio element!");
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
