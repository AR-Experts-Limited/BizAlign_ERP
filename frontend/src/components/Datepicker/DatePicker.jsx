import { IoCalendarOutline } from "react-icons/io5";
import flatpickr from "flatpickr";
import { useEffect, useRef, useState } from "react";
import { TiDelete } from "react-icons/ti";
import "flatpickr/dist/flatpickr.min.css";
import { cn } from "../../lib/utils";

const DatePicker = ({ id, label, iconPosition, name, value, minDate, maxDate, required, onChange, error, disabled }) => {
    const flatpickrRef = useRef(null);
    const flatpickrInstance = useRef(null);
    const [date, setDate] = useState("");



    const handleDateChange = (selectedDates) => {
        if (selectedDates.length > 0) {
            setDate(selectedDates[0]);
            onChange(selectedDates[0])
        } else {
            setDate("");
        }
    };

    const handleClearDate = () => {
        flatpickrInstance.current.clear();
        setDate("");
        if (onChange) onChange("");
    };


    useEffect(() => {
        if (flatpickrRef.current) {
            flatpickrInstance.current = flatpickr(flatpickrRef.current, {
                mode: "single",
                monthSelectorType: "dropdown",
                position: "auto",
                minDate: minDate,
                disableMobile: true,
                maxDate: maxDate,
                onChange: handleDateChange,
            });

            return () => {
                flatpickrInstance.current.destroy(); // Cleanup to prevent memory leaks
            };
        }
    }, []);

    useEffect(() => {
        if (flatpickrRef.current) {
            flatpickrInstance.current?.set({
                minDate: minDate,
                maxDate: maxDate,
            });
        }

    }, [minDate, maxDate])

    useEffect(() => {
        setDate(value);
    }, [value]);

    return (
        <div>
            <label htmlFor={id} className={`${disabled ? 'text-gray-200' : 'text-dark'} text-body-sm font-medium  dark:text-white`}>
                {label}
                {required && <span className="ml-1 select-none text-red">*</span>}
            </label>
            <div
                className={cn(
                    "relative mt-3 [&_svg]:absolute [&_svg]:top-1/2 [&_svg]:-translate-y-1/2",
                    iconPosition === "left" ? "[&_svg]:left-4.5" : "[&_svg]:right-4.5"
                )}
            >
                <input
                    ref={flatpickrRef}
                    name={name}
                    className={cn("flatpickr form-datepicker w-full  rounded-lg border-[1.5px] border-neutral-300 bg-transparent px-5.5 py-3.5 h-13 outline-none transition focus:border-primary-500 active:border-primar-500 dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary pl-12.5", error ? 'border-[1.5px] border-red animate-pulse' : '')}
                    placeholder="mm/dd/yyyy"
                    required={required}
                    disabled={disabled}
                    value={date ? new Date(date).toLocaleDateString().split('T')[0] : ''} //
                />


                {date ? <TiDelete onClick={handleClearDate} className="size-7 cursor-pointer text-red-light" /> : <IoCalendarOutline className="pointer-events-none size-5 text-neutral-300" />}

            </div>
        </div>
    );
};

export default DatePicker;
