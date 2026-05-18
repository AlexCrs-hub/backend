exports.get404 = (req, res, next) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};
