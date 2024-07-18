import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Props = {
  name: string;
  localAudioTrack: MediaStreamTrack;
  localVideoTrack: MediaStreamTrack;
};

const URL = "http://localhost:3000";

export const Room = ({ name, localAudioTrack, localVideoTrack }: Props) => {
  const [socket, setSocket] = useState<Socket | null>();
  const [lobby, setLobby] = useState(true);
  const [sendingPc, setSendingPc] = useState<RTCPeerConnection | null>(null);
  const [receivingPc, setReceivingPc] = useState<RTCPeerConnection | null>(
    null
  );
  const [remoteAudioTrack, setRemoteAudioTrack] =
    useState<MediaStreamTrack | null>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] =
    useState<MediaStreamTrack | null>(null);
  const [remoteMediaStream, setRemoteMediaStream] =
    useState<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>();
  const localVideoRef = useRef<HTMLVideoElement>();

  useEffect(() => {
    const socket = io(URL);

    socket.on("send-offer", async ({ roomId }) => {
      console.log("sending offer");
      setLobby(false);
      const pc = new RTCPeerConnection();

      setSendingPc(pc);

      if (localVideoTrack) {
        console.log("add local video track: ", localVideoTrack);
        pc.addTrack(localVideoTrack);
      }

      if (localAudioTrack) {
        console.log("add local audio track: ", localAudioTrack);
        pc.addTrack(localAudioTrack);
      }

      pc.onicecandidate = async (e) => {
        console.log("received ice candidate locally");
        if (e.candidate) {
          socket.emit("ice-candidate", {
            candidate: e.candidate,
            type: "sender",
            roomId,
          });
        }
      };

      pc.onnegotiationneeded = async () => {
        console.log("on negotiation needed, sending offer");
        const sdp = await pc.createOffer();

        pc.setLocalDescription(sdp);
        socket.emit("offer", {
          sdp,
          roomId,
        });
      };
    });

    socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
      console.log("received offer");
      setLobby(false);

      const pc = new RTCPeerConnection();
      pc.setRemoteDescription(remoteSdp);
      const sdp = await pc.createAnswer();
      pc.setLocalDescription(sdp);
      const stream = new MediaStream();
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }

      setRemoteMediaStream(stream);
      setReceivingPc(pc);
      // window.pcr = pc;
      pc.ontrack = (e) => {
        alert("on track");
      };

      pc.onicecandidate = async (e) => {
        if (!e.candidate) return;

        console.log("on ice candidate on receiving side");
        if (e.candidate) {
          socket.emit("ice-candidate", {
            candidate: e.candidate,
            type: "receiver",
            roomId,
          });
        }
      };

      socket.emit("answer", { roomId, sdp: sdp });

      setTimeout(() => {
        const track1 = pc.getTransceivers()[0].receiver.track;
        const track2 = pc.getTransceivers()[1].receiver.track;
        console.log(track1);

        if (track1.kind === "video") {
          setRemoteAudioTrack(track2);
          setRemoteVideoTrack(track1);
        } else {
          setRemoteAudioTrack(track1);
          setRemoteVideoTrack(track2);
        }

        // @ts-ignore
        remoteVideoRef.current?.srcObject.addTrack(track1);
        // @ts-ignore
        remoteVideoRef.current?.srcObject.addTrack(track2);

        remoteVideoRef.current?.play();
      }, 5000);
    });

    socket.on("answer", ({ roomId, sdp: remoteSdp }) => {
      setLobby(false);
      setSendingPc((pc) => {
        pc?.setRemoteDescription(remoteSdp);
        return pc;
      });
      console.log("loop closed");
    });

    socket.on("lobby", () => {
      setLobby(true);
    });

    socket.on("ice-candidate", ({ candidate, type }) => {
      console.log("add ice candidate from remote", {
        candidate: candidate,
        type: type,
      });

      if (type === "sender") {
        setReceivingPc((pc) => {
          if (!pc) console.error("receiving pc not found");
          else console.log(pc.ontrack);
          pc?.addIceCandidate(candidate);
          return pc;
        });
      } else {
        setSendingPc((pc) => {
          if (!pc) console.error("sending pc not found");
          // else console.log(pc.ontrack);
          pc?.addIceCandidate(candidate);
          return pc;
        });
      }
    });

    setSocket(socket);
  }, [name]);

  useEffect(() => {
    if(localVideoRef.current) {
      if(localVideoTrack) {
        localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
        localVideoRef.current.play();
      }
    }
  }, [localVideoRef])
  

  return <div>
    Hi, {name}
    <video autoPlay width={400} height={400} ref={localVideoRef}></video>
    {lobby ? "Waiting for others..." : null}
    <video autoPlay width={400} height={400} ref={remoteVideoRef}></video>
  </div>;
};
