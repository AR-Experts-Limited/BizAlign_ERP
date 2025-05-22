import { useEffect, useState, useRef } from "react";
import { FaSearch, FaCloudDownloadAlt } from "react-icons/fa";
import { IoFilterCircleSharp, IoPrint } from "react-icons/io5";
import * as XLSX from "xlsx";
// import { useReactToPrint } from 'react-to-print'; // Import react-to-print
import jsPDF from "jspdf"; // Import jsPDF
import autoTable from "jspdf-autotable";

const TableFeatures = ({ columns, setColumns, content, setContent }) => {
  const col = Object.keys(columns);
  const [filterCol, setFilterCol] = useState(col);
  const [search, setSearch] = useState(false);
  const [searchCol, setSearchCol] = useState(Object.values(columns)[0]);
  const [searchVal, setSearchVal] = useState("");
  const [originalContent, setOriginalContent] = useState([]);
  const [originalColumns, setOriginalColumns] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);

  const tableRef = useRef(); // Ref for the table content

  // Store original data when component mounts or content changes
  useEffect(() => {
    if (originalContent.length === 0 && content.length > 0) {
      setOriginalContent(structuredClone(content));
    }
    if (
      Object.keys(originalColumns).length === 0 &&
      Object.keys(columns).length > 0
    ) {
      setOriginalColumns(structuredClone(columns));
    }
  }, [content, columns]);

  useEffect(() => {
    if (!searchVal.trim()) {
      setContent(structuredClone(originalContent));
      return;
    }
    const filteredContent = originalContent.filter((p) => {
      if (
        Array.isArray(p[searchCol]) &&
        p[searchCol].length === parseInt(searchVal, 10)
      ) {
        return true;
      }
      return String(p[searchCol] || "")
        .toLowerCase()
        .includes(searchVal.toLowerCase());
    });

    setContent(filteredContent);
  }, [searchVal, searchCol]);

  const downloadExcel = (data) => {
    const keysToExtract = columns;
    const filterData = data.map((item) => {
      let filteredItem = {};
      Object.entries(keysToExtract).forEach(([key, value]) => {
        if (item[value] !== undefined) {
          filteredItem[key] = Array.isArray(item[value])
            ? item[value].length
            : item[value];
        }
      });
      return filteredItem;
    });
    const worksheet = XLSX.utils.json_to_sheet(filterData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "DataSheet.xlsx");
  };

  useEffect(() => {
    const handleFilterColumns = () => {
      const filteredData = originalContent.map((obj) => {
        return Object.keys(obj)
          .filter((keyFilter) =>
            filterCol.includes(
              Object.entries(originalColumns).find(
                ([key, value]) => value === keyFilter
              )?.[0]
            )
          )
          .reduce((filteredObj, key) => {
            filteredObj[key] = obj[key];
            return filteredObj;
          }, {});
      });
      const filteredObj = Object.fromEntries(
        Object.entries(originalColumns).filter(([key, value]) =>
          filterCol.includes(key)
        )
      );
      setColumns(filteredObj);
      setContent(filteredData);
    };
    handleFilterColumns();
  }, [filterCol, originalContent]);

  // const handlePrint = async () => {
  //     try {
  //         // Create temporary container
  //         const tempDiv = document.createElement("div");
  //         tempDiv.style.width = "1550px"; // A4 width in pixels
  //         tempDiv.style.height = "550px"; // A4 height in pixels
  //         tempDiv.style.minWidth = "1550px";
  //         tempDiv.style.minHeight = "550px";
  //         tempDiv.style.maxWidth = "1550px";
  //         tempDiv.style.maxHeight = "550px";

  //         // Clone and append content
  //         const clone = tableRef.current.cloneNode(true);
  //         tempDiv.appendChild(clone);
  //         document.body.appendChild(tempDiv);

  //         // Wait briefly for DOM update
  //         await new Promise(resolve => setTimeout(resolve, 100));

  //         // Generate PDF
  //         const doc = new jsPDF('landscape', 'mm', 'a4');

  //         await doc.html(tempDiv, {
  //             margin: [10, 10, 10, 10],
  //             html2canvas: {
  //                 scale: 0.22, // Adjust scale as needed
  //                 logging: true,
  //                 useCORS: true,
  //                 allowTaint: true,
  //                 width: 70,  // Ensure it fits the page width (subtract margins)
  //                 height: 100,  // Ensure it fits the page height (subtract margins)
  //             },
  //             callback: (doc) => {
  //                 // Clean up
  //                 document.body.removeChild(tempDiv);

  //                 // Save or open PDF
  //                 const pdfBlob = doc.output('blob');
  //                 const pdfUrl = URL.createObjectURL(pdfBlob);
  //                 window.open(pdfUrl);
  //             }
  //         });
  //     } catch (error) {
  //         console.error("PDF generation failed:", error);
  //     }
  // };
  //Print functionality

  const handlePrint = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Table data
    const tableColumns = ["#", ...Object.keys(columns)];
    const tableRows = content.map((cust, index) => [
      index + 1,
      ...Object.values(columns).map((variable) =>
        Array.isArray(cust[variable]) ? cust[variable].length : cust[variable]
      ),
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

    // Add title
    doc.setFontSize(16);

    // This will directly trigger the print dialog
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const printWindow = window.open(pdfUrl);
  };

  const TableContent = () => {
    return (
      <div className="print-only m-5 rounded-lg" ref={tableRef}>
        <table className="ind-customer-table w-full">
          <thead>
            <tr style={{ color: "black" }} className="h-10">
              <th>#</th>
              {Object.keys(columns).map((col) => (
                <th>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.map((cust, index) => (
              <tr className="text-center cursor-pointer">
                <td>{index + 1}</td>
                {Object.values(columns).map((variable) => (
                  <td>
                    {Array.isArray(cust[variable])
                      ? cust[variable].length
                      : cust[variable]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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
            onChange={(e) => setSearchVal(e.target.value)}
            className="h-full p-2 pr-12 md:pr-24 w-full rounded-sm border-[1.5px] border-neutral-300 bg-white outline-none transition focus:border-primary-500 disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary-500 dark:disabled:bg-dark"
          />
          <select
            value={searchCol}
            onChange={(e) => setSearchCol(e.target.value)}
            className="absolute w-10 md:w-20 text-xs text-white bg-neutral-400/70 rounded-xs overflow-hidden right-2 top-1/2 -translate-y-1/2 outline-none dark:bg-dark-2 dark:border dark:border-dark-4 dark:disabled:bg-dark"
          >
            {Object.keys(columns).map(
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
          onClick={() => setSearch(!search)}
        >
          <FaSearch size={13} />
          <div className="z-10 absolute left-1/2 top-full -translate-x-1/2 whitespace-normal break-words rounded-sm bg-black/40 mt-1 backdrop-blur-md px-1 text-[0.6rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity dark:bg-dark-4">
            Search
          </div>
        </button>
      </div>
      <div>
        <button
          onClick={() => downloadExcel(content)}
          className={`relative p-1 rounded-md hover:bg-neutral-200 hover:text-white dark:hover:bg-dark-3 group`}
        >
          <FaCloudDownloadAlt size={21} />
          <div className="z-10 absolute left-1/2 top-full -translate-x-1/2 whitespace-normal rounded-sm bg-black/40 mt-1 backdrop-blur-md px-1 text-[0.6rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity dark:bg-dark-4">
            Download CSV
          </div>
        </button>
      </div>
      <div className="relative">
        <button
          onClick={() => setFilterOpen(!filterOpen)}
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
            {Object.keys(originalColumns).map((col) => (
              <div className="w-fit p-2 flex gap-3 text-sm">
                <input
                  checked={filterCol.includes(col)}
                  value={col}
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked)
                      setFilterCol((prev) => [...prev, col]);
                    else setFilterCol((prev) => prev.filter((c) => c !== col));
                  }}
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
          className={`relative p-1 rounded-md hover:bg-neutral-200 hover:text-white dark:hover:bg-dark-3 group`}
        >
          <IoPrint size={18} />
          <div className="z-10 absolute left-1/2 top-full -translate-x-1/2 whitespace-normal break-words rounded-sm bg-black/40 mt-1 backdrop-blur-md px-1 text-[0.6rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity dark:bg-dark-4">
            Print
          </div>
        </button>
      </div>
      <TableContent />
    </div>
  );
};

export default TableFeatures;
