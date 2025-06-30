// GridComponent.jsx
import React from "react";
import { MultiGrid, AutoSizer } from "react-virtualized";
import "react-virtualized/styles.css";

const rowCount = 300;
const columnCount = 30;
const rowHeight = 40;
const columnWidth = 120;

const GridComponent = () => {
    const cellRenderer = ({ columnIndex, rowIndex, key, style }) => {
        const isHeader = rowIndex === 0;
        const isFirstCol = columnIndex === 0;
        const isTopLeft = isHeader && isFirstCol;

        let classNames =
            "flex items-center justify-center border border-gray-300 text-sm";

        if (isTopLeft) {
            classNames += " bg-gray-200 font-bold";
        } else if (isHeader) {
            classNames += " bg-gray-100 font-semibold";
        } else if (isFirstCol) {
            classNames += " bg-gray-50 font-medium";
        } else {
            classNames += " bg-white";
        }

        return (
            <div key={key} className={classNames} style={style}>
                {isTopLeft
                    ? "Header"
                    : isHeader
                        ? `Col ${columnIndex}`
                        : isFirstCol
                            ? `Row ${rowIndex}`
                            : `R${rowIndex}-C${columnIndex}`}
            </div>
        );
    };

    return (
        <div className="m-12 rounded-md  h-[80vh] overflow-hidden">
            <AutoSizer>
                {({ width, height }) => (
                    <MultiGrid
                        fixedRowCount={1}
                        fixedColumnCount={1}
                        rowCount={rowCount}
                        columnCount={columnCount}
                        rowHeight={rowHeight}
                        columnWidth={columnWidth}
                        height={height}
                        width={width}
                        cellRenderer={cellRenderer}
                        classNameTopLeftGrid="z-50"
                        classNameTopRightGrid="z-40"
                        classNameBottomLeftGrid="z-30"
                        classNameBottomRightGrid="z-20"
                    />
                )}
            </AutoSizer>
        </div>
    );
};

export default GridComponent;
