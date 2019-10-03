import { Store } from "../main";

class Delay<T> extends Store<T, T, number> {
  run() {
    const input = this.input;
    setTimeout(() => {
      this.output = input;
    }, this.state);
  }
}

export default Delay;
