module.exports = (buffer, mimeType) => {
    if (!buffer) return undefined;
    const mime = mimeType || 'application/octet-stream';
    return `data:${mime};base64,${buffer.toString('base64')}`;
};

