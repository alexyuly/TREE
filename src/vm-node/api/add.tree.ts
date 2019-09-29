import { StaticStream } from "../main";

class Add extends StaticStream<number, number, number> {
  run() {
    this.output = this.input + this.state;
  }
}

export default Add;
