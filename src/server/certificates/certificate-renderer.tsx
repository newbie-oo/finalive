import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificateDoc, type CertificateData } from "./certificate-doc";

export interface CertificateRenderer {
  render(data: CertificateData): Promise<Buffer>;
}

export class ReactPdfCertificateRenderer implements CertificateRenderer {
  async render(data: CertificateData): Promise<Buffer> {
    return renderToBuffer(<CertificateDoc {...data} />);
  }
}
