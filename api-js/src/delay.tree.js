module.exports = props => {
  setTimeout(() => {
    props.out = props.in;
  }, props.state);
};
