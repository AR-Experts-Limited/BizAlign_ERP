import { useEffect, useState, useCallback } from "react";
import { FaSearch, FaCloudDownloadAlt } from "react-icons/fa";
import { IoFilterCircleSharp, IoPrint } from "react-icons/io5";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import debounce from "lodash/debounce";

const TableFeatures = ({ columns, setColumns, content, setContent, repopulate, setRepopulate }) => {
  const colKeys = Object.keys(columns);
  const [filterCol, setFilterCol] = useState(colKeys);
  const [search, setSearch] = useState(false);
  const [searchCol, setSearchCol] = useState(Object.values(columns)[0] || "");
  const [searchVal, setSearchVal] = useState("");
  const [originalContent, setOriginalContent] = useState([]);
  const [originalColumns, setOriginalColumns] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);

  // console.log(searchVal)
  // Store original data on mount or content/columns change
  useEffect(() => {
    if ((content.length > 0 && originalContent.length === 0) || repopulate) {
      setOriginalContent([...content]); // Shallow copy
      if (setRepopulate) setRepopulate(false)
    }
    if (Object.keys(columns).length > 0 && Object.keys(originalColumns).length === 0) {
      setOriginalColumns({ ...columns }); // Shallow copy
    }
  }, [content, columns, originalContent.length, originalColumns]);

  // Debounced search handler
  const handleSearch = (value, column, originalData) => {
    console.log(value)
    if (!value.trim()) {
      setContent([...originalData]);
      return;
    }
    const filteredContent = originalData.filter((item) => {
      const itemValue = item[column];
      if (Array.isArray(itemValue)) {
        return itemValue.length === parseInt(value, 10);
      }
      return String(itemValue || "").toLowerCase().includes(value.toLowerCase());
    });
    setContent(filteredContent);
  }

  useEffect(() => {
    handleSearch(searchVal, searchCol, originalContent);
  }, [searchVal, searchCol, originalContent]);

  // Memoized downloadExcel
  const downloadExcel = useCallback(() => {
    try {
      const keysToExtract = columns;
      const filterData = content.map((item) => {
        let filteredItem = {};

        Object.entries(keysToExtract).forEach(([key, value]) => {
          const fieldValue = item[value];

          if (fieldValue !== undefined) {
            if (Array.isArray(fieldValue)) {
              filteredItem[key] = fieldValue.length;
            } else {
              const date = new Date(fieldValue);
              const isValidDate =
                typeof fieldValue === 'string' &&
                fieldValue.includes('-') &&
                !isNaN(date);

              filteredItem[key] = isValidDate
                ? date.toLocaleDateString() // e.g., "6/25/2025"
                : fieldValue;
            }
          }
        });

        return filteredItem;
      });

      const worksheet = XLSX.utils.json_to_sheet(filterData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, "DataSheet.xlsx");
    } catch (error) {
      console.error("Excel download failed:", error);
    }
  }, [content, columns]);

  // Memoized handlePrint
  const handlePrint = useCallback(() => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const tableColumns = ["#", ...Object.keys(columns)];
      const tableRows = content.map((cust, index) => [
        index + 1,
        ...Object.values(columns).map((variable) => {
          const value = cust[variable];

          if (Array.isArray(value)) {
            return value.length;
          }

          const date = new Date(value);
          if (value && !isNaN(date) && typeof value === 'string' && value.includes('-')) {
            return date.toLocaleDateString(); // Format date
          }

          return value ?? 'N/A';
        }),
      ]);

      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 20,
        margin: { top: 20, left: 10, right: 10 },
        styles: {
          fontSize: 10,
          cellPadding: 2,
          textColor: [0, 0, 0], // neutral-400
          lineColor: [229, 231, 235], // border-neutral-300
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [243, 244, 246], // bg-neutral-100
          textColor: [107, 114, 128], // text-neutral-400
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },
        columnStyles: {
          0: { cellWidth: 10 }, // Fixed width for # column
        },
      });

      doc.setFontSize(16);
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl);
    } catch (error) {
      console.error("PDF generation failed:", error);
    }
  }, [content, columns]);

  // Memoized filter columns
  const handleFilterColumns = useCallback(() => {
    const filteredObj = Object.fromEntries(
      Object.entries(originalColumns).filter(([key]) => filterCol.includes(key))
    );
    setColumns(filteredObj);
    // setContent([...originalContent]); // Reset content to original
  }, [filterCol, originalColumns, setColumns]);

  useEffect(() => {
    handleFilterColumns();
  }, [handleFilterColumns]);

  // Memoized event handlers
  const toggleSearch = useCallback(() => setSearch((prev) => !prev), []);
  const toggleFilter = useCallback(() => setFilterOpen((prev) => !prev), []);
  const handleSearchValChange = useCallback((e) => setSearchVal(e.target.value), []);
  const handleSearchColChange = useCallback((e) => setSearchCol(e.target.value), []);
  const handleFilterColChange = useCallback((col, checked) => {
    setFilterCol((prev) => (checked ? [...prev, col] : prev.filter((c) => c !== col)));
  }, []);

  return (
    <div
      className={`flex items-center h-10 p-1 pr-1 gap-2 border border-neutral-300 rounded-lg justify-between bg-stone-50 text-neutral-500 transition-all duration-300 ${search ? "w-auto" : "max-w-fit"
        } dark:bg-dark dark:border-dark-4`}
    >
      <div className="flex h-full relative justify-between items-center">
        {/* Input Container */}
        <div
          className={`relative mr-2 overflow-hidden h-full transition-all duration-300 ${search ? "w-30 md:w-58" : "w-0"
            }`}
        >
          <input
            type="text"
            value={searchVal}
            onChange={handleSearchValChange}
            className="h-full p-2 pr-12 md:pr-24 w-full rounded-sm border-[1.5px] border-neutral-300 bg-white outline-none transition focus:border-primary-500 disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary-500 dark:disabled:bg-dark"
          />
          <select
            value={searchCol}
            onChange={handleSearchColChange}
            className="absolute w-10 md:w-20 text-xs text-white bg-neutral-400/70 rounded-xs overflow-hidden right-2 top-1/2 -translate-y-1/2 outline-none dark:bg-dark-2 dark:border dark:border-dark-4 dark:disabled:bg-dark"
          >
            {colKeys.map(
              (col) =>
                filterCol.includes(col) && (
                  <option key={col} value={columns[col]}>
                    {col}
                  </option>
                )
            )}
          </select>
        </div>
        <button
          className={`relative p-2 rounded-md hover:bg-neutral-200 hover:text-white ${search ? "bg-neutral-300 dark:bg-dark-3 text-white" : ""
            } dark:hover:bg-dark-3 group`}
          onClick={toggleSearch}
        >
          <FaSearch size={13} />
          <div className="z-10 absolute left-1/2 top-full -translate-x-1/2 whitespace-normal break-words rounded-sm bg-black/40 mt-1 backdrop-blur-md px-1 text-[0.6rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity dark:bg-dark-4">
            Search
          </div>
        </button>
      </div>
      <div>
        <button
          onClick={downloadExcel}
          className="relative p-1 rounded-md hover:bg-neutral-200 hover:text-white dark:hover:bg-dark-3 group"
        >
          <FaCloudDownloadAlt size={21} />
          <div className="z-10 absolute left-1/2 top-full -translate-x-1/2 whitespace-normal rounded-sm bg-black/40 mt-1 backdrop-blur-md px-1 text-[0.6rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity dark:bg-dark-4">
            Download CSV
          </div>
        </button>
      </div>
      <div className="relative">
        <button
          onClick={toggleFilter}
          className={`relative p-1 rounded-md hover:bg-neutral-200 hover:text-white ${filterOpen ? "bg-neutral-200 hover:text-white dark:bg-dark-3" : ""
            } dark:hover:bg-dark-3 group`}
        >
          <IoFilterCircleSharp size={21} />
          <div className="z-10 absolute left-1/2 top-full -translate-x-1/2 whitespace-normal break-words rounded-sm bg-black/40 mt-1 backdrop-blur-md px-1 text-[0.6rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity dark:bg-dark-4">
            Filter Columns
          </div>
        </button>
        {filterOpen && (
          <div className="absolute w-50 rounded-lg z-70 px-6 py-2 top-7 right-0 flex flex-col gap-1 bg-white border border-neutral-200 dark:bg-dark/30 dark:border-dark-3 dark:text-white">
            {colKeys.map((col) => (
              <div key={col} className="w-fit p-2 flex gap-3 text-sm">
                <input
                  checked={filterCol.includes(col)}
                  value={col}
                  type="checkbox"
                  onChange={(e) => handleFilterColChange(col, e.target.checked)}
                />
                <label>{col}</label>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <button
          onClick={handlePrint}
          className="relative p-1 rounded-md hover:bg-neutral-200 hover:text-white dark:hover:bg-dark-3 group"
        >
          <IoPrint size={18} />
          <div className="z-10 absolute left-1/2 top-full -translate-x-1/2 whitespace-normal break-words rounded-sm bg-black/40 mt-1 backdrop-blur-md px-1 text-[0.6rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity dark:bg-dark-4">
            Print
          </div>
        </button>
      </div>
    </div>
  );
};

export default TableFeatures;