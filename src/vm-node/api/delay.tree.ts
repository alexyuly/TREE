import { StaticStream } from "../main";

class Delay<T> extends StaticStream<T, T, number> {
  run() {
    const input = this.input;
    setTimeout(() => {
      this.output = input;
    }, this.state);
  }
}

export default Delay;
