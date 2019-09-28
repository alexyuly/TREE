import { DelegateProcess } from "../main";

class Delay<T> extends DelegateProcess<T, T, number> {
  run() {
    const input = this.input;
    setTimeout(() => {
      this.output = input;
    }, this.state);
  }
}

export default Delay;
