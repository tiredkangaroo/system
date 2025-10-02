import { useEffect, useState } from "react";
import { type SystemInfo } from "../types";
import { FaPowerOff } from "react-icons/fa6";
import { StaticInfoView } from "./StaticInfo";
import { DynamicInfoView } from "./DynamicInfo";
import { ProcessesView } from "./Processes";

function App() {
  const [serverURL, setServerURL] = useState<string | null>(
    localStorage.getItem("serverURL")
  );
  const [currentInfo, setCurrentInfo] = useState<SystemInfo | undefined>(
    undefined
  );
  const [wsReadyState, setWsReadyState] = useState<number | null>(null);
  useEffect(() => {
    if (!serverURL) return;
    const ws = new WebSocket(`${serverURL}/api/v1/info/ws`);
    ws.onopen = () => {
      setWsReadyState(ws.readyState);
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setCurrentInfo(data);
      setWsReadyState(ws.readyState);
    };
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsReadyState(ws.readyState);
    };
    ws.onclose = () => {
      setWsReadyState(ws.readyState);
    };
    return () => {
      ws.close();
    };
  }, [serverURL]);

  return (
    <div className="w-full h-full p-2 flex flex-col gap-2">
      <ServerURLInput serverURL={serverURL} setServerURL={setServerURL} />
      <SystemInfoDisplay
        serverURL={serverURL!}
        info={currentInfo}
        wsReadyState={wsReadyState}
      />
    </div>
  );
}

interface SystemInfoDisplayProps {
  info: SystemInfo | undefined;
  wsReadyState: number | null;
  serverURL: string;
}
function SystemInfoDisplay(props: SystemInfoDisplayProps) {
  if (!props.info) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center">
        No data
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col gap-5">
      <div className="w-full mt-1 flex flex-row justify-between align-middle items-center">
        <div
          style={{
            backgroundColor:
              props.wsReadyState === WebSocket.OPEN ? "#05a839" : "#ab0c03",
          }}
          title={
            props.wsReadyState === WebSocket.OPEN
              ? "connected to host (information is live)"
              : "not connected to host (information is stale)"
          }
          className="rounded-4xl w-4 h-4 aspect-square text-white"
        >
          {" "}
        </div>
        <button
          className="bg-gray-400 rounded-4xl p-2 shadow-md"
          title="shut down host"
        >
          <FaPowerOff />
        </button>
      </div>

      <StaticInfoView info={props.info} />
      <DynamicInfoView info={props.info} />
      <ProcessesView
        serverURL={props.serverURL}
        processes={props.info.processes}
      />
    </div>
  );
}

interface ServerURLInputProps {
  serverURL: string | null;
  setServerURL: (url: string) => void;
}
function ServerURLInput(props: ServerURLInputProps) {
  return (
    <div className="flex flex-row gap-2 justify-center items-center">
      URL:
      <input
        type="text"
        defaultValue={props.serverURL || ""}
        onBlur={(e) => {
          props.setServerURL(e.target.value);
          localStorage.setItem("serverURL", e.target.value);
        }}
        className="border border-gray-600 rounded-md py-1 px-2 w-full text-sm"
      />
    </div>
  );
}

export default App;
