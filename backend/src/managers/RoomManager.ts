import { User } from "./UserManager";

let GLOBAL_ROOM_ID = 1;

interface Room {
  user1: User;
  user2: User;
}

export class RoomManager {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map<string, Room>();
  }

  createRoom(user1: User, user2: User) {
    const roomId = this.generate().toString();
    this.rooms.set(roomId, {
      user1,
      user2,
    });

    user1.socket.emit("send-offer", {
      roomId,
    });

    user2.socket.emit("send-offer", {
      roomId,
    });
  }

  onIceCandidates(roomId: string, senderSocketId: string, candidate: any, type: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const receivingUser =
      room.user1.socket.id === senderSocketId? room.user2 : room.user1;
    receivingUser.socket.emit("ice-candidate", {
      candidate,
      type,
    });
  }

  onAnswer(roomId: string, sdp: string, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const receivingUser =
      room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    receivingUser.socket.emit("answer", {
      sdp,
      roomId,
    });
  }

  onOffer(roomId: string, sdp: string, senderSocketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const receivingUser =
      room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
    receivingUser.socket.emit("offer", {
      sdp,
      roomId,
    });
  }

  generate() {
    return GLOBAL_ROOM_ID++;
  }
}
