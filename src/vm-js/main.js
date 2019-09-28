class Listener {
  constructor(process) {
    this._process = process;
  }

  send() {
    // abstract
  }
}

class StateListener extends Listener {
  send(value) {
    super.input = value;
    this._process.state = value;
  }
}

class InputListener extends Listener {
  send(value) {
    super.input = value;
    this._process.input = value;
  }
}

class OutputListener extends Listener {
  send(value) {
    super.input = value;
    this._process.output = value;
  }
}

class Process {
  static create(spec, listeners) {
    if (spec.type === "component") {
      return new ComponentProcess(spec, listeners);
    }
    return new DelegateProcess(spec, listeners);
  }

  constructor(listeners = []) {
    this._listeners = listeners;
  }

  _run() {
    // abstract
  }

  get input() {
    return this._input;
  }

  set input(value) {
    this._input = value;
    this._run();
  }

  set output(value) {
    for (const listener of this._listeners) {
      listener.send(value);
    }
  }
}

class DelegateProcess extends Process {
  constructor(spec, listeners) {
    super(listeners);
    this._delegate = require(`./api/${spec.type}.tree`);
    if (spec.type === "value-producer") {
      const value = spec.props.find(x => x.key === "value").val;
      this.state = value;
      this._run();
    } else {
      const stateProp = spec.props.find(x => x.key === "state");
      if (stateProp) {
        const state = stateProp.val;
        Process.create(state, [new StateListener(this)]);
        // TODO The state process should listen through its input.
      }
    }
  }

  _run() {
    super._run();
    this._delegate(this);
  }

  get state() {
    return this._state;
  }

  set state(value) {
    this._state = value;
  }
}

class ComponentProcess extends Process {
  constructor(spec, listeners) {
    super(listeners);
    const consumers = spec.props.find(x => x.key === "consumers").val;
    const consumerProcesses = consumers.map(x =>
      Process.create(x, [new OutputListener(this)])
    );
    const consumerListeners = consumerProcesses.map(x => new InputListener(x));
    const producers = spec.props.find(x => x.key === "producers").val;
    const producerProcesses = producers.map(x =>
      Process.create(x, consumerListeners)
    );
    this._producerListeners = producerProcesses.map(x => new InputListener(x));
  }

  _run() {
    super._run();
    for (const producerListener of this._producerListeners) {
      producerListener.send(this._input);
    }
  }
}

module.exports = spec => {
  new ComponentProcess(spec);
};
