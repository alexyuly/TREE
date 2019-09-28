import { DelegateProcess } from "../main";

class Add extends DelegateProcess<number, number, number> {
  run() {
    this.output = this.input + this.state;
  }
}

export default Add;
