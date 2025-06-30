import React, { useRef, useState } from 'react';
import { FixedSizeGrid } from 'react-window';

const GridComponent = () => {
    const columnCount = 30;
    const rowCount = 300;
    const columnWidth = 100;
    const rowHeight = 50;

    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const onScroll = ({ scrollLeft, scrollTop }) => {
        setScrollLeft(scrollLeft);
        setScrollTop(scrollTop);
    };

    const Cell = ({ columnIndex, rowIndex, style }) => (
        <div
            className="flex items-center justify-center border border-gray-200 bg-white"
            style={style}
        >
            Item {rowIndex * columnCount + columnIndex}
        </div>
    );

    const HeaderRow = () => (
        <div
            className="sticky top-0 z-20 bg-gray-100 flex"
            style={{ marginLeft: columnWidth - scrollLeft }}
        >
            {Array.from({ length: columnCount - 1 }).map((_, index) => {
                const columnIndex = index + 1;
                return (
                    <div
                        key={columnIndex}
                        className="flex items-center justify-center border border-gray-300 font-semibold text-sm"
                        style={{ width: columnWidth, height: rowHeight, flexShrink: 0 }}
                    >
                        Header {columnIndex}
                    </div>
                );
            })}
        </div>
    );

    const FirstColumn = () => (
        <div
            className="sticky left-0 z-10 bg-gray-100"
            style={{ marginTop: rowHeight - scrollTop }}
        >
            {Array.from({ length: rowCount - 1 }).map((_, index) => {
                const rowIndex = index + 1;
                return (
                    <div
                        key={rowIndex}
                        className="flex items-center justify-center border border-gray-300 font-semibold text-sm"
                        style={{ width: columnWidth, height: rowHeight }}
                    >
                        Row {rowIndex}
                    </div>
                );
            })}
        </div>
    );

    const TopLeftCell = () => (
        <div
            className="sticky top-0 left-0 z-30  flex items-center justify-center bg-primary-800 text-white font-bold text-sm "
            style={{ width: columnWidth, height: rowHeight }}
        >
            Personnes List
        </div>
    );

    return (
        <div className="relative w-[800px] h-[400px] overflow-auto m-10 border border-neutral-200 rounded-md">
            {/* Top-Left Cell */}
            <TopLeftCell />

            {/* Header Row */}
            <div className="absolute top-0 left-0">
                <HeaderRow />
            </div>

            {/* First Column */}
            <div className="absolute top-0 bottom-0">
                <FirstColumn />
            </div>

            {/* Grid */}
            <FixedSizeGrid
                columnCount={columnCount}
                columnWidth={columnWidth}
                height={400}
                rowCount={rowCount}
                rowHeight={rowHeight}
                width={800}
                onScroll={onScroll}
                className="z-0"
            >
                {Cell}
            </FixedSizeGrid>
        </div>
    );
};

export default GridComponent;
