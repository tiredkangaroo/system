import type { JSX } from "react";

export function Paginated({
  elements,
  pageNumber,
  setPageNumber,
  elementsPerPage,
}: {
  elements: JSX.Element[];
  pageNumber: number;
  setPageNumber: (page: number) => void;
  elementsPerPage: number;
}) {
  const numPages = Math.ceil(elements.length / elementsPerPage);
  return (
    <div>
      {elements.slice(
        pageNumber * elementsPerPage,
        (pageNumber + 1) * elementsPerPage
      )}
      <div className="flex flex-row items-center align-middle justify-center gap-4">
        {[
          ...Array.from(
            {
              length:
                Math.min(numPages, pageNumber + 5) -
                Math.max(0, pageNumber - 3),
            },
            (_, i) => Math.max(0, pageNumber - 3) + i
          ),
        ].map((v, index) => {
          return (
            <button
              key={index}
              onClick={() => setPageNumber(v)}
              style={{
                color: pageNumber === v ? "black" : "blue",
                textDecoration: pageNumber === v ? "none" : "underline",
                cursor: pageNumber === v ? "default" : "pointer",
              }}
            >
              {v + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Search<T>({
  list,
  objectKeyForFilter,
  filteredList,
  setFilteredList,
}: {
  list: T[];
  objectKeyForFilter: keyof T;
  filteredList: T[];
  setFilteredList: (list: T[]) => void;
}) {
  return (
    <div className="">
      <input
        className="w-[50%] px-1 border-1 rounded-sm"
        placeholder="search by name"
        onChange={(e) => {
          if (e.target.value.length == 0) {
            setFilteredList(list);
            return;
          }
          setFilteredList(
            list
              .filter((proc) =>
                (proc[objectKeyForFilter] as string)
                  .toLowerCase()
                  .includes(e.target.value.toLowerCase())
              )
              .sort(
                (a, b) =>
                  (a[objectKeyForFilter] as string).length -
                  (b[objectKeyForFilter] as string).length
              ) // sorts least to greatest name length so smth like systemd doesn't come before system if the search is "system"
          );
        }}
      />{" "}
      ({filteredList.length} results)
    </div>
  );
}
