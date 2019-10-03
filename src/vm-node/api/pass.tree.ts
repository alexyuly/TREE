import { Store } from "../main";

class Pass<O, I> extends Store<O, I, O> {
  run() {
    this.output = this.state;
  }
}

export default Pass;
