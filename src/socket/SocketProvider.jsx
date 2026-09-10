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

	const value = {
		socket: socketRef.current,
		isConnected,
	};

	return (
		<SocketContext.Provider value={value}>{children}</SocketContext.Provider>
	);
};
