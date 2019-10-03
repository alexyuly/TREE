import { Store } from "../main";

class Add extends Store<number, number, number> {
  run() {
    this.output = this.input + this.state;
  }
}

export default Add;
