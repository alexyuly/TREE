import { StaticStream } from "../main";

class Pass<O, I> extends StaticStream<O, I, O> {
  run() {
    this.output = this.state;
  }
}

export default Pass;
