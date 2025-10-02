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
  return (
    <div className="my-4">
      <div className="w-full flex flex-row justify-between">
        <div className="flex flex-row items-center gap-2">
          <div
            style={{ backgroundColor: statusColor(service.status) }}
            title={service.status}
            className="w-3 h-3 aspect-square"
          ></div>
          <h2 className="text-xl font-bold">{service.name}</h2>
        </div>
        <div className="flex flex-row gap-2">
          {service.status !== "running" && (
            <button
              className="bg-gray-300 px-2 py-1 rounded-sm hover:bg-gray-400"
              title="start service"
              onClick={() => {
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
          )}
          {(service.status === "running" || service.status === "failed") && (
            <button
              className="bg-gray-300 px-2 py-1 rounded-sm hover:bg-gray-400"
              title="stop service"
              onClick={() => {
                fetch(`${serverURL}/api/v1/service/${service.name}/stop`, {
                  method: "PATCH",
                });
              }}
            >
              <BsXOctagonFill />
            </button>
          )}
          {(service.status === "running" || service.status === "failed") && (
            <button
              className="bg-gray-300 px-2 py-1 rounded-sm hover:bg-gray-400"
              title="restart service"
              onClick={() => {
                fetch(`${serverURL}/api/v1/service/${service.name}/restart`, {
                  method: "PATCH",
                });
              }}
            >
              <MdOutlineRestartAlt />
            </button>
          )}
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
      return "#70ff8f";
    case "dead":
      return "#000";
    case "failed":
      return "#ff4b3b";
    case "exited":
      return "#6cc269";
  }
  return "#fff";
}
