module.exports = stream => {
  setTimeout(() => {
    stream.output = stream.input;
  }, stream.state);
};
