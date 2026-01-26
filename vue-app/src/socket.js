import io from "socket.io-client";

const socket = io("http://localhost:4000");
// const socket = io("http://192.168.13.23:4000");

export default socket;
