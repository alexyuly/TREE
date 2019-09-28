import {
  DelegateProcess,
  DelegateProcessRunner,
  ValueProducerProcessSpec
} from "../main";

export default class ValueProducer<T> extends DelegateProcessRunner<
  T,
  void,
  T
> {
  constructor(
    process: DelegateProcess<T, void, T>,
    spec: ValueProducerProcessSpec<T>
  ) {
    super(process, spec);
    this.process.state = spec.props.value;
    this.process.output = this.process.state;
  }
}
