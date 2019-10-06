import { StreamWithState } from "../main";

class Pass<O, I> extends StreamWithState<O, I, O> {
  run() {
    this.output = this.state;
  }
}

export default Pass;
