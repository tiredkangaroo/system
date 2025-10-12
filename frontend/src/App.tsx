import { useEffect, useState } from "react";
import { type SystemInfo } from "../types";
import { StaticInfoView } from "./StaticInfo";
import { DynamicInfoView } from "./DynamicInfo";
import { ProcessesView } from "./Processes";
import { ServicesView } from "./Services";
import { LogsDialog } from "./LogsDialog";
import { MdOutlineDescription } from "react-icons/md";

function App() {
  const [serverURL, setServerURL] = useState<string | null>(
    localStorage.getItem("serverURL")
  );
  const [currentInfo, setCurrentInfo] = useState<SystemInfo | undefined>(
    undefined
  );
  const [wsReadyState, setWsReadyState] = useState<number | null>(null);
  const [logURL, setLogURL] = useState<string | null>(null);
  useEffect(() => {
    connectToWebSocket(serverURL, setCurrentInfo, setWsReadyState);
  }, [serverURL]);

  return (
    <div className="w-full h-full p-2 flex flex-col gap-2">
      <LogsDialog logURL={logURL} setLogURL={setLogURL} />
      <ServerURLInput serverURL={serverURL} setServerURL={setServerURL} />
      <SystemInfoDisplay
        serverURL={serverURL!}
        info={currentInfo}
        wsReadyState={wsReadyState}
        setLogURL={setLogURL}
      />
    </div>
  );
}

async function connectToWebSocket(
  url: string | null,
  setCurrentInfo: (info: SystemInfo) => void,
  setWsReadyState: (state: number | null) => void
) {
  if (!url) return;
  const res = await fetch(`${url}/api/v1/auth`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    const v = prompt("Authentication required. Please provide the TOTP code.");
    if (!v) {
      alert("No TOTP code provided. Connection aborted.");
      return;
    }
    if (v.length !== 8 || isNaN(Number(v))) {
      alert("Invalid TOTP code. Connection aborted.");
      return;
    }
    const res2 = await fetch(`${url}/api/v1/auth`, {
      method: "GET",
      headers: {
        Authorization: v,
      },
      credentials: "include",
    });
    if (!res2.ok) {
      const errorData = await res2.json();
      alert(`Authentication failed: ${errorData.error}. Connection aborted.`);
      return;
    }
  }
  const ws = new WebSocket(`${url}/api/v1/info/ws`);
  ws.onopen = () => {
    setWsReadyState(ws.readyState);
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(data);
    setCurrentInfo(data);
    setWsReadyState(ws.readyState);
  };
  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    setWsReadyState(ws.readyState);
    connectToWebSocket(url, setCurrentInfo, setWsReadyState);
  };
  ws.onclose = () => {
    setWsReadyState(ws.readyState);
    connectToWebSocket(url, setCurrentInfo, setWsReadyState);
  };
  return () => {
    ws.close();
  };
}

interface SystemInfoDisplayProps {
  info: SystemInfo | undefined;
  wsReadyState: number | null;
  serverURL: string;
  setLogURL: (url: string | null) => void;
}
function SystemInfoDisplay(props: SystemInfoDisplayProps) {
  const [hasPrivilege, setHasPrivilege] = useState<boolean | null>(null);
  useEffect(() => {
    if (!props.serverURL) return;
    fetch(`${props.serverURL}/api/v1/is_privileged`, {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        res.json().then((data) => {
          setHasPrivilege(data.privileged);
        });
      })
      .catch((error) => {
        console.error("error fetching privilege status:", error);
      });
  }, [props.serverURL]);
  return (
    <div className="w-full h-full flex flex-col gap-5">
      {props.info ? (
        <>
          <div className="w-full flex flex-row justify-between items-center py-1 px-1">
            <p
              style={{
                color:
                  props.wsReadyState === WebSocket.OPEN ? "#05a839" : "#ab0c03",
              }}
              className="text-center"
            >
              {props.wsReadyState === WebSocket.OPEN ? (
                <>
                  <b>connected to host</b> {privilegeText(hasPrivilege)}
                </>
              ) : (
                "not connected to host"
              )}
            </p>
            <button
              className="px-2 py-2 rounded-sm bg-gray-300 hover:bg-gray-400 cursor-pointer w-fit"
              title="view system logs"
              onClick={() => {
                props.setLogURL(`${props.serverURL}/api/v1/logs`);
              }}
            >
              <MdOutlineDescription />
            </button>
          </div>
          <StaticInfoView info={props.info} />
          <DynamicInfoView info={props.info} />
          <ProcessesView
            serverURL={props.serverURL}
            processes={props.info.processes}
            systemInfo={props.info}
            hasPrivilege={hasPrivilege}
          />
          <ServicesView
            serverURL={props.serverURL}
            info={props.info}
            setLogURL={props.setLogURL}
            hasPrivilege={hasPrivilege}
          />
        </>
      ) : (
        <LoadingScreen></LoadingScreen>
      )}
    </div>
  );
}

function privilegeText(privileged: boolean | null) {
  if (privileged === null) {
    return null;
  }
  return privileged ? (
    <span style={{ color: "#05a839" }}>with privilege</span>
  ) : (
    <span style={{ color: "#ab0c03" }}>without privilege</span>
  );
}

function LoadingScreen() {
  return (
    <div
      role="status"
      className="w-full h-full flex flex-col justify-center items-center"
    >
      <svg
        aria-hidden="true"
        className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-red-600"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
      <span className="sr-only">Loading...</span>
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
