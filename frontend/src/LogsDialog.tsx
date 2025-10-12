import { useState } from "react";

export function LogsDialog({
  logURL,
  setLogURL,
}: {
  logURL: string | null;
  setLogURL: (url: string | null) => void;
}) {
  const [queryParam, setQueryParam] = useState(new URLSearchParams());
  if (!logURL) return null;

  let logName = logURL.split("/").at(-2);
  if (logName == "v1") {
    logName = "system";
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-[80%] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">{logName} logs</h2>
          <button
            onClick={() => setLogURL(null)}
            className="text-gray-600 hover:text-gray-800 cursor-pointer font-bold"
          >
            Close
          </button>
        </div>
        {/* since (unix sec), until (unix sec), this boot only (bool) */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-row gap-8 items-center">
            <div>
              from:{" "}
              <input
                className="w-fit rounded-md border p-1"
                type="datetime-local"
                onBlur={(e) => {
                  const qp = new URLSearchParams(queryParam.toString());
                  qp.set(
                    "since",
                    (e.target.valueAsDate!.getTime() / 1000).toString()
                  );
                  setQueryParam(qp);
                }}
              />
            </div>
            <div>
              to:{" "}
              <input
                className="w-fit border rounded-md p-1"
                type="datetime-local"
                onBlur={(e) => {
                  const vaD = e.target.valueAsDate;
                  if (!vaD) return;
                  const qp = new URLSearchParams(queryParam.toString());
                  qp.set("until", (vaD!.getTime() / 1000).toString());
                  setQueryParam(qp);
                }}
              />
            </div>
            <div>
              this boot only:{" "}
              <input
                type="checkbox"
                onChange={(e) => {
                  const qp = new URLSearchParams(queryParam.toString());
                  if (e.target.checked) {
                    qp.set("this_boot_only", "true");
                  } else {
                    qp.delete("this_boot_only");
                  }
                  setQueryParam(qp);
                }}
              />
            </div>
          </div>

          <iframe
            src={logURL + "?" + queryParam.toString()}
            title="Logs"
            className="w-full h-[60vh] border-[0.5px]"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
