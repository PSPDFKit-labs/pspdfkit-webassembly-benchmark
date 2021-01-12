import React from "react";

export default class PSPDFKit extends React.Component {
  ref = React.createRef();

  async componentDidMount() {
    const { pdf, licenseKey, isWasm } = this.props;

    window.PSPDFKit.load({
      pdf,
      licenseKey,
      container: this.ref.current,
      disableIndexedDBCaching: false,
      disableWebAssemblyStreaming: true,
      disableWebAssembly: !isWasm,
      standaloneInstancesPoolSize: 1
    });
  }

  render() {
    return (
      <div className="PSPDFKit-container isDone isHidden">
        <div id="PSPDFKit-container" ref={this.ref} />
      </div>
    );
  }
}
