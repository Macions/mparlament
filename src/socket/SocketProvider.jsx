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

	// useEffect(() => {
	// 	const SOCKET_URL = "http://localhost:4000";

	// 	socketRef.current = io(SOCKET_URL, {
	// 		transports: ["websocket"],
	// 		autoConnect: true,
	// 	});

	// 	socketRef.current.on("connect", () => {
	// 		console.log("✅ Połączono z WebSocket");
	// 		setIsConnected(true);
	// 	});

	// 	socketRef.current.on("disconnect", () => {
	// 		console.log("❌ Rozłączono z WebSocket");
	// 		setIsConnected(false);
	// 	});

	// 	socketRef.current.on("connect_error", (error) => {
	// 		console.error("Błąd połączenia WebSocket:", error);
	// 	});

	// 	return () => {
	// 		if (socketRef.current) {
	// 			socketRef.current.disconnect();
	// 		}
	// 	};
	// }, []);

	const value = {
		socket: socketRef.current,
		isConnected,
	};

	return (
		<SocketContext.Provider value={value}>{children}</SocketContext.Provider>
	);
};
