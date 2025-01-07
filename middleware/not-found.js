const notFound = (req,res) => {
    res.status(404).send("no such router found please check url");
}

module.exports = notFound;