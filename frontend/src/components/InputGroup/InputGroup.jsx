import { cn } from "../../lib/utils";
import { useId } from "react";
import React, { useState, forwardRef } from "react";
import PhoneInput from "react-country-phone-input";
import "react-country-phone-input/lib/plain.css";

/**
 * A reusable input group component with support for various input types
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes for the container
 * @param {string} props.label - Label text for the input
 * @param {string} [props.type] - Input type (phone, dropdown, or standard input)
 * @param {string} [props.placeholder] - Placeholder text for the input
 * @param {boolean} [props.required] - Whether the input is required
 * @param {boolean} [props.disabled] - Whether the input is disabled
 * @param {boolean} [props.active] - Whether the input is active
 * @param {Function} [props.onChange] - Change event handler
 * @param {React.ReactNode} [props.icon] - Icon element to display
 * @param {string} [props.fileStyleVariant] - Style variant for file inputs
 * @param {string} [props.name] - Input name attribute
 * @param {string} [props.iconPosition] - Position of the icon (left or right)
 * @param {string} [props.height] - Height variant (e.g., sm)
 * @param {string} [props.value] - Controlled input value
 * @param {boolean} [props.error] - Whether to show error styling
 * @param {string} [props.defaultValue] - Default input value
 * @param {React.ReactNode} [props.children] - Children elements (for dropdown)
 * @returns {JSX.Element} Input group component
 * @author Sanjaykumar Ramachandran
 */
const InputGroup = forwardRef(({
  className,
  label,
  type,
  placeholder,
  required,
  disabled,
  active,
  onChange,
  icon,
  fileStyleVariant,
  name,
  iconPosition,
  height,
  value,
  error,
  defaultValue,
  children,
  checked,
  background,
  withIcon,
  backgroundSize,
  min,
  step,
  inputStyles,
  accept,
  maxLength,
}, ref) => {
  const id = useId();

  // Function to render the correct input based on type
  const renderInput = () => {
    switch (type) {
      case "phone":
        return (
          <PhoneInput
            country={"gb"}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            containerClass="!h-full !rounded-lg"
            inputClass={cn(
              " !w-full !font-outfit !text-base !border-[1.5px] !bg-transparent !border-neutral-300 !py-6 !px-14 rounded-lg focus:!border-primary-500 dark:!bg-dark-2 dark:!border-dark-3",
              error ? "!border-[1.5px] !border-red animate-pulse" : ""
            )}
            buttonClass="!p-1 !my-1 !border-[0px] !border-r-1 !border-neutral-300 dark:!border-dark-3 !bg-transparent !rounded-l-lg"
            dropdownClass="!rounded-lg  dark:!bg-dark-3 dark:!border-dark-4"
          />
        );
      case "toggleswitch":
        return (
          <label
            htmlFor={id}
            className="flex max-w-fit cursor-pointer select-none items-center"
          >
            <div className="relative">
              <input
                type="checkbox"
                checked={checked}
                name={name}
                id={id}
                onChange={onChange}
                className="peer sr-only"
              />
              <div
                className={cn(
                  "h-6 w-11 peer-checked:bg-primary-600/40  transition-colors rounded-full bg-gray-3 dark:bg-[#5A616B]",
                  {
                    "h-5": backgroundSize === "sm",
                    "bg-[#212B36] dark:bg-primary": background === "dark",
                  }
                )}
              />

              <div
                className={cn(
                  "absolute top-1 left-1 flex size-4 items-center justify-center rounded-full bg-white shadow-switch-1 transition-all duration-300 peer-checked:translate-x-5 peer-checked:[&_.check-icon]:block peer-checked:[&_.x-icon]:hidden",
                  {
                    "-top-1 left-0 size-7 shadow-switch-2":
                      backgroundSize === "sm",
                    "peer-checked:dark:bg-white": background !== "dark",
                  }
                )}
              >
                {withIcon && (
                  <>
                    {/* <CheckIcon className="check-icon hidden fill-white dark:fill-dark" />
                            <XIcon className="x-icon" /> */}
                  </>
                )}
              </div>
            </div>
          </label>
        );
      case "textarea":
        return (
          <textarea
            id={id}
            type={type}
            name={name}
            placeholder={placeholder}
            onChange={onChange}
            value={value}
            required={required}
            disabled={disabled}
            data-active={active}
            defaultValue={defaultValue}
            className={cn(
              "w-full rounded-lg border-[1.5px] border-neutral-300 bg-transparent outline-none transition focus:border-primary-500 disabled:cursor-default disabled:bg-gray-2 data-[active=true]:border-primary-500 dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary-500 dark:disabled:bg-dark dark:data-[active=true]:border-primary-500",
              "px-5.5 py-3.5  placeholder:text-dark-6 dark:text-white resize-y",
              iconPosition === "left" && "pl-12.5",
              height === "sm" && "py-2.5",
              error ? "border-[1.5px] border-red animate-pulse" : ""
            )}
          />
        );
      case "dropdown":
        return (
          <select
            id={id}
            type={type}
            name={name}
            placeholder={placeholder}
            onChange={onChange}
            value={value}
            required={required}
            disabled={disabled}
            data-active={active}
            defaultValue={defaultValue}
            className={cn(
              "w-full rounded-lg border-[1.5px] border-neutral-300 bg-transparent outline-none transition focus:border-primary-500 disabled:cursor-default disabled:bg-gray-2 data-[active=true]:border-primary-500 dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary-500 dark:disabled:bg-dark dark:data-[active=true]:border-primary-500",
              "px-5.5 py-3.5  placeholder:text-dark-6 dark:text-white",
              iconPosition === "left" && "pl-12.5",
              height === "sm" && "py-2.5",
              error ? "border-[1.5px] border-red animate-pulse" : ""
            )}
          >
            {children}
          </select>
        );
      default:
        return (
          <input
            ref={ref}
            id={id}
            type={type}
            name={name}
            placeholder={placeholder}
            onChange={onChange}
            value={value}
            min={min}
            accept={accept}
            step={step}
            defaultValue={defaultValue}
            className={cn(
              "w-full rounded-lg border-[1.5px] border-neutral-300 bg-transparent outline-none transition focus:border-primary-500 disabled:cursor-default disabled:bg-gray-2 data-[active=true]:border-primary-500 dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary-500 dark:disabled:bg-dark dark:data-[active=true]:border-primary-500",
              type === "file"
                ? getFileStyles(fileStyleVariant)
                : "px-5.5 py-3 text-dark placeholder:text-dark-6 dark:text-white",
              iconPosition === "left" && "pl-12.5",
              height === "sm" && "py-2.5",
              error ? "border-[1.5px] border-red animate-pulse" : "", inputStyles
            )}
            required={required}
            disabled={disabled}
            data-active={active}
            maxLength={maxLength}
          />
        );
    }
  };

  return (
    <div className={className}>
      {/* Label with optional required indicator */}
      <label
        htmlFor={id}
        className="text-body-sm font-medium text-black dark:text-white"
      >
        {label}
        {required && <span className="ml-1 select-none text-red">*</span>}
      </label>

      {/* Input container with icon positioning */}
      <div
        className={cn(
          "relative mt-3 [&_svg]:absolute [&_svg]:top-1/2 [&_svg]:-translate-y-1/2",
          iconPosition === "left" ? "[&_svg]:left-4.5" : "[&_svg]:right-4.5",
        )}
      >
        {renderInput()}
        {/* Optional icon */}
        {icon}
      </div>
    </div>
  );
});

export default InputGroup;

/**
 * Returns Tailwind CSS styles for file input based on variant
 * @param {string} variant - The style variant for file input
 * @returns {string} Tailwind CSS classes for file input styling
 * @author Sanjaykumar Ramachandran
 */
function getFileStyles(variant) {
  switch (variant) {
    case "style1":
      return "file:mr-5 file:border-collapse file:cursor-pointer file:border-0 file:border-r file:border-solid file:border-stroke file:bg-[#E2E8F0] file:px-6.5 file:py-[13px] file:text-body-sm file:font-medium file:text-dark-5 file:hover:bg-primary-100 file:hover:bg-opacity-50 dark:file:border-dark-3 dark:file:bg-white/30 dark:file:text-white";
    default:
      return "file:mr-4 file:rounded file:border-[0.5px] file:border-stroke file:bg-stroke file:px-2.5 file:py-1 file:text-body-xs file:font-medium file:text-dark-5 file:focus:border-primary-50 dark:file:border-dark-3 dark:file:bg-white/30 dark:file:text-white px-3 py-[9px]";
  }
}
