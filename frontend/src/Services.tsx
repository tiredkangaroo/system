import { useState } from "react";
import type { Service, SystemInfo } from "../types";
import { Paginated, Search } from "./Paginated";
import { MdOutlineRestartAlt } from "react-icons/md";
import { BsXOctagonFill } from "react-icons/bs";
import { VscDebugStart } from "react-icons/vsc";

const statusOrder: Record<Service["status"], number> = {
  running: 0,
  failed: 1,
  dead: 2,
  exited: 3,
};

export function ServicesView({
  info,
  serverURL,
}: {
  info: SystemInfo;
  serverURL: string;
}) {
  const [filteredServices, setFilteredServices] = useState<Service[]>(
    info.services
  );
  const [pageNumber, setPageNumber] = useState(0);
  return (
    <div className="w-full bg-rose-100 flex flex-col gap-2 py-4 px-2 rounded-sm">
      <div>
        <h1 className="text-2xl font-bold">
          services ({info.services.length})
        </h1>
      </div>
      <div className="flex flex-col gap-4">
        <Search
          list={info.services}
          objectKeyForFilter="name"
          filteredList={filteredServices}
          setFilteredList={(v) => {
            setFilteredServices(v);
            setPageNumber(0);
          }}
        />
        <Paginated
          elements={filteredServices
            .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
            .map((v, i) => (
              <Service service={v} serverURL={serverURL} />
            ))}
          pageNumber={pageNumber}
          setPageNumber={setPageNumber}
          elementsPerPage={10}
        />
      </div>
    </div>
  );
}

function Service({
  service,
  serverURL,
}: {
  service: Service;
  serverURL: string;
}) {
  const startEnabled = service.status !== "running";
  const stopEnabled =
    service.status === "running" || service.status === "failed";
  const restartEnabled =
    service.status === "running" || service.status === "failed";
  return (
    <div className="my-4">
      <div className="w-full flex flex-row justify-between">
        <div className="flex flex-row items-center gap-2">
          <h2
            style={{ color: statusColor(service.status) }}
            className="text-xl font-bold"
          >
            {service.name}
          </h2>
        </div>
        <div className="flex flex-row gap-2">
          <button
            className="px-2 py-1 rounded-sm hover:bg-gray-400 cursor-pointer"
            title={
              startEnabled
                ? "start service"
                : "cannot start; service already running"
            }
            style={{
              backgroundColor: startEnabled ? "#d1d5dc" : "#686869",
            }}
            disabled={!startEnabled}
            onClick={() => {
              if (!startEnabled) return;
              fetch(`${serverURL}/api/v1/service/${service.name}/start`, {
                method: "PATCH",
              }).then((resp) => {
                if (resp.ok) {
                }
              });
            }}
          >
            <VscDebugStart />
          </button>
          <button
            style={{
              backgroundColor: stopEnabled ? "#d1d5dc" : "#686869",
            }}
            className="bg-gray-300 px-2 py-1 rounded-sm hover:bg-gray-400 cursor-pointer"
            title={
              stopEnabled
                ? "stop service"
                : "cannot stop a dead or exited service"
            }
            disabled={!stopEnabled}
            onClick={() => {
              if (!stopEnabled) return;
              fetch(`${serverURL}/api/v1/service/${service.name}/stop`, {
                method: "PATCH",
              });
            }}
          >
            <BsXOctagonFill />
          </button>
          <button
            style={{
              backgroundColor: restartEnabled ? "#d1d5dc" : "#686869",
            }}
            className="px-2 py-1 rounded-sm hover:bg-gray-400 cursor-pointer"
            title={
              restartEnabled
                ? "restart service"
                : "cannot restart a dead or exited service"
            }
            disabled={!restartEnabled}
            onClick={() => {
              fetch(`${serverURL}/api/v1/service/${service.name}/restart`, {
                method: "PATCH",
              });
            }}
          >
            <MdOutlineRestartAlt />
          </button>
        </div>
      </div>
      <p className="text-sm">
        ({service.status}) {service.description}
      </p>
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "running":
      return "#61ad68";
    case "dead":
      return "#000";
    case "failed":
      return "#ff4b3b";
    case "exited":
      return "#507344";
  }
  return "#fff";
}
