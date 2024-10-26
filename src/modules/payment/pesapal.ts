import { 
  AbstractPaymentProvider,
  BigNumber,
} from "@medusajs/framework/utils"
import {
  PaymentProviderError,
  PaymentSessionStatus,
  PaymentProviderSessionResponse,
  CreatePaymentProviderSession,
  UpdatePaymentProviderSession,
} from "@medusajs/framework/types"
import axios from "axios"

type PesapalOptions = {
  consumerKey: string
  consumerSecret: string
  ipnId: string
  callbackUrl: string
  isTest: boolean
}

class PesapalPaymentProcessor extends AbstractPaymentProvider<PesapalOptions> {
  static identifier = "pesapal"

  constructor(container, options: PesapalOptions) {
    super(container, options)
    this.options_ = options
  }

  async initiatePayment(
    context: CreatePaymentProviderSession
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    try {
      const { amount, currency_code, resource_id } = context
      
      const response = await this.makeRequest("POST", "/api/Transactions/SubmitOrderRequest", {
        id: resource_id,
        currency: currency_code,
        amount: amount,
        description: `Payment for order ${resource_id}`,
        callback_url: this.options_.callbackUrl,
        notification_id: this.options_.ipnId,
        billing_address: {
          email_address: context.email,
          phone_number: context.billing_address?.phone || "",
          country_code: context.billing_address?.country_code || "",
          first_name: context.billing_address?.first_name || "",
          middle_name: "",
          last_name: context.billing_address?.last_name || "",
          line_1: context.billing_address?.address_1 || "",
          line_2: context.billing_address?.address_2 || "",
          city: context.billing_address?.city || "",
          state: context.billing_address?.province || "",
          postal_code: context.billing_address?.postal_code || "",
          zip_code: context.billing_address?.postal_code || "",
        },
      })

      return {
        session_data: {
          order_tracking_id: response.data.order_tracking_id,
          merchant_reference: response.data.merchant_reference,
          redirect_url: response.data.redirect_url,
        },
      }
    } catch (error) {
      return {
        error: error.message,
        code: "unknown",
        detail: error
      }
    }
  }

  async authorizePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProviderError | { status: PaymentSessionStatus; data: Record<string, unknown> }
  > {
    try {
      const status = await this.getPaymentStatus(paymentSessionData)
      return {
        status,
        data: paymentSessionData,
      }
    } catch (error) {
      return {
        error: error.message,
        code: "unknown",
        detail: error
      }
    }
  }

  async capturePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<Record<string, unknown> | PaymentProviderError> {
    return await this.getPaymentStatus(paymentSessionData)
  }

  async getPaymentStatus(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentSessionStatus> {
    const { order_tracking_id } = paymentSessionData
    
    if (!order_tracking_id) {
      return PaymentSessionStatus.PENDING
    }

    try {
      const response = await this.makeRequest("GET", `/api/Transactions/GetTransactionStatus?orderTrackingId=${order_tracking_id}`)
      
      switch (response.data.payment_status_description) {
        case "Completed":
          return PaymentSessionStatus.AUTHORIZED
        case "Failed":
          return PaymentSessionStatus.ERROR
        default:
          return PaymentSessionStatus.PENDING
      }
    } catch (error) {
      return PaymentSessionStatus.ERROR
    }
  }

  async refundPayment(
    paymentSessionData: Record<string, unknown>,
    refundAmount: number
  ): Promise<Record<string, unknown> | PaymentProviderError> {
    try {
      const { order_tracking_id } = paymentSessionData
      
      const response = await this.makeRequest("POST", "/api/Transactions/RefundRequest", {
        confirmation_code: order_tracking_id,
        amount: refundAmount,
        reason: "Customer requested refund",
      })

      return {
        refund_id: response.data.refund_id,
        status: response.data.status,
      }
    } catch (error) {
      return {
        error: error.message,
        code: "unknown",
        detail: error
      }
    }
  }

  async cancelPayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<Record<string, unknown> | PaymentProviderError> {
    return await this.getPaymentStatus(paymentSessionData)
  }

  async deletePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<Record<string, unknown> | PaymentProviderError> {
    return {}
  }

  async retrievePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<Record<string, unknown> | PaymentProviderError> {
    return await this.getPaymentStatus(paymentSessionData)
  }

  async updatePayment(
    context: UpdatePaymentProviderSession
  ): Promise<void | PaymentProviderError> {
    // No update needed for Pesapal
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
    const baseUrl = this.options_.isTest ? "https://cybqa.pesapal.com/pesapalv3" : "https://pay.pesapal.com/v3"
    const url = `${baseUrl}${endpoint}`

    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${await this.getAccessToken()}`,
    }

    return axios({ method, url, headers, data })
  }

  private async getAccessToken(): Promise<string> {
    const tokenUrl = this.options_.isTest ? 
      "https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken" : 
      "https://pay.pesapal.com/v3/api/Auth/RequestToken"

    const response = await axios.post(tokenUrl, {
      consumer_key: this.options_.consumerKey,
      consumer_secret: this.options_.consumerSecret,
    })

    return response.data.token
  }
}

export default PesapalPaymentProcessor
