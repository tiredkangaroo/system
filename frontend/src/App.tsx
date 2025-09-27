import { useEffect, useState } from "react";
import { type SystemInfo } from "../types";

function App() {
  const [serverURL, setServerURL] = useState<string | null>(null);
  const [currentInfo, setCurrentInfo] = useState<SystemInfo | undefined>(
    undefined
  );
  useEffect(() => {
    if (!serverURL) return;
    fetch(`${serverURL}/api/v1/info`)
      .then((response) => response.json())
      .then((data) => setCurrentInfo(data))
      .catch((error) => console.error("error fetching system info:", error));
  }, [serverURL]);
  console.log(currentInfo);

  return (
    <div className="w-full h-full p-2 flex flex-col gap-2">
      <ServerURLInput serverURL={serverURL} setServerURL={setServerURL} />
      <p>currently {serverURL}</p>
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
        onBlur={(e) => props.setServerURL(e.target.value)}
        className="border border-gray-600 rounded-md py-1 px-2 w-full"
      />
    </div>
  );
}

export default App;
