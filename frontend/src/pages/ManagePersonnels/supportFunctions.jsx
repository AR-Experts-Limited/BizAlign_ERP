export const handleFileView = (filePath) => {
    const ext = filePath.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
        const imgWindow = window.open("", "_blank", "width=800,height=600");
        imgWindow.document.write(`
            <html>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; background:#000;">
            <img src="${filePath}" style="max-width:100%; max-height:100vh;" />
            </body>
            </html>
            `);
    } else {
        window.open(filePath, "_blank");
    }
}