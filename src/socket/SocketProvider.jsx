import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import io from "socket.io-client";

const SocketContext = createContext();

export const useSocket = () => {
	const context = useContext(SocketContext);
	if (!context) {
		throw new Error("useSocket must be used within a SocketProvider");
	}
	return context;
};

export const SocketProvider = ({ children }) => {
	const [isConnected, setIsConnected] = useState(false);
	const socketRef = useRef(null);

	useEffect(() => {
		// console.log("SocketProvider useEffect START");
		const token = localStorage.getItem("token");
		if (!token) {
			// console.log("SocketProvider: brak tokenu, nie łączę");
			return;
		}

		// console.log("SocketProvider: tworzę socket z tokenem");
		const socketUrl = import.meta.env.DEV
			? "http://localhost:4000"
			: window.location.origin;

		const socketPath = import.meta.env.DEV ? "/socket.io" : "/newapp/socket.io";

		const socket = io(socketUrl, {
			path: socketPath,
			auth: { token },
			transports: ["websocket", "polling"],
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionAttempts: 10,
		});

		socketRef.current = socket;

		socket.on("connect", () => {
			// console.log("Socket.IO połączony:", socket.id);
			setIsConnected(true);
		});

		socket.on("disconnect", (reason) => {
			// console.log("Socket.IO rozłączony:", reason);
			setIsConnected(false);
		});

		socket.on("connect_error", (err) => {
			// console.error("Socket.IO connect_error FULL:", {
			// 	message: err.message,
			// 	type: err.type,
			// 	description: err.description,
			// 	context: err.context,
			// 	data: err.data,
			// });
			setIsConnected(false);
		});

		return () => {
			// console.log("SocketProvider useEffect CLEANUP");
			socket.disconnect();
			socketRef.current = null;
		};
	}, []);

	const value = {
		socket: socketRef.current,
		isConnected,
	};

	return (
		<SocketContext.Provider value={value}>{children}</SocketContext.Provider>
	);
};
