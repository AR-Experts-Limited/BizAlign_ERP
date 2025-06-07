import { useState, useEffect } from "react";
import chroma from "chroma-js";

export default function ApplicationSettings() {
    const [selectedColor, setSelectedColor] = useState('');

    useEffect(() => {
        const savedColor = localStorage.getItem("primary-color") ? localStorage.getItem("primary-color") : getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();;
        if (savedColor) {
            applyTheme(savedColor);
            setSelectedColor(savedColor)
        }
    }, []);

    const applyTheme = (baseColor) => {
        localStorage.setItem("primary-color", baseColor);

        const scale = chroma
            .scale([
                chroma(baseColor).brighten(2),
                baseColor,
                chroma(baseColor).darken(2),
            ])
            .mode("lab")
            .colors(11);

        const root = document.documentElement;
        root.style.setProperty("--primary", baseColor);

        const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
        steps.forEach((step, i) => {
            root.style.setProperty(`--primary-${step}`, scale[i]);
        });

    };

    const handleChangeClick = () => {
        applyTheme(selectedColor);
        window.location.reload();

    };

    const handleResetClick = () => {
        applyTheme(getComputedStyle(document.documentElement).getPropertyValue('--default-primary').trim())
        window.location.reload();
    }

    return (
        <div className='w-full h-full flex flex-col p-1.5 md:p-3.5'>
            <h1 className="text-xl font-bold mb-2">Application Settings</h1>
            <div className="bg-white h-full p-6 rounded-lg text-black space-y-4 border border-neutral-200">
                <h1 className="text-lg font-bold mb-2">Theme Settings</h1>
                <p className="text-sm text-neutral-600">Customize the default application theme to align with your brand's identity and visual standards.<br />
                    The theme you select determines the colour schemes followed throughout the application.</p>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-3 bg-gray-100 border border-neutral-200 rounded-lg p-4">
                        <div>
                            <h1 className="text-lg font-bold mb-2">Theme Color</h1>
                            <p>Choose the theme colour.</p>
                        </div>
                        <div>
                            <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => setSelectedColor(e.target.value)}
                                className="w-16 h-10  border-none outline-none cursor-pointer"
                            />
                            <br />
                            <div className='flex gap-3'>
                                <button
                                    onClick={handleChangeClick}
                                    className="mt-2 px-4 py-2 bg-[var(--color-primary-600)] text-white rounded hover:opacity-90 transition"
                                >
                                    Change
                                </button>
                                <button
                                    onClick={handleResetClick}
                                    className="mt-2 px-4 py-2 bg-gray-500 text-white rounded hover:opacity-90 transition"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
