import { StreamWithState } from "../main";

class Add extends StreamWithState<number, number, number> {
  run() {
    this.output = this.input + this.state;
  }
}

export default Add;
