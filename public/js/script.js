const socket = io();

let local;
let peerConnection;
let remote;

const rtcSettings = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const initialize = async () => {
  try {
    local = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    document.querySelector("#localVideo").srcObject = local;
    document.querySelector("#localVideo").style.display = "block";

    socket.on("signalingMessage", handleSignalingMessage);
    initiateOffer();
  } catch (error) {
    console.error("Error accessing media devices.", error);
  }
};

const initiateOffer = async () => {
  try {
    await createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("signalingMessage", JSON.stringify({ type: "offer", offer }));
  } catch (error) {
    console.error("Error creating offer.", error);
  }
};

const createPeerConnection = async () => {
  try {
    peerConnection = new RTCPeerConnection(rtcSettings);
    remote = new MediaStream();
    document.querySelector("#remoteVideo").srcObject = remote;
    document.querySelector("#remoteVideo").style.display = "block";
    document.querySelector("#remoteVideo").classList.add("smallFrame");

    local.getTracks().forEach((track) => {
      peerConnection.addTrack(track, local);
    });

    peerConnection.ontrack = (event) =>
      event.streams[0].getTracks().forEach((track) => remote.addTrack(track));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signalingMessage", JSON.stringify({ type: "candidate", candidate: event.candidate }));
      }
    };
  } catch (error) {
    console.error("Error creating peer connection.", error);
  }
};

const handleSignalingMessage = async (message) => {
  const { type, offer, answer, candidate } = JSON.parse(message);
  try {
    if (type === "offer") await handleOffer(offer);
    if (type === "answer") await handleAnswer(answer);
    if (type === "candidate" && peerConnection) {
      await peerConnection.addIceCandidate(candidate);
    }
  } catch (error) {
    console.error("Error handling signaling message.", error);
  }
};

const handleOffer = async (offer) => {
  try {
    await createPeerConnection();
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("signalingMessage", JSON.stringify({ type: "answer", answer }));
  } catch (error) {
    console.error("Error handling offer.", error);
  }
};

const handleAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    await peerConnection.setRemoteDescription(answer);
  }
};

document.querySelector("#cameraButton").addEventListener("click", () => {
  local.getVideoTracks().forEach((track) => {
    track.enabled = !track.enabled;
    document.querySelector("#cameraButton").classList.toggle("bg-red-600", !track.enabled);
  });
});

document.querySelector("#micButton").addEventListener("click", () => {
  local.getAudioTracks().forEach((track) => {
    track.enabled = !track.enabled;
    document.querySelector("#micButton").classList.toggle("bg-green-600", !track.enabled);
  });
});

initialize();
