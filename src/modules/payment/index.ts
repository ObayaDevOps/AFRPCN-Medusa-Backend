import PesapalPaymentProcessor from "./pesapal"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"

export default ModuleProvider(Modules.PAYMENT, {
  services: [PesapalPaymentProcessor],
})