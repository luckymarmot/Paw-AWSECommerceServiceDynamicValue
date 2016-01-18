import URI from "urijs"

@registerDynamicValueClass
class AWSECommerceServiceDynamicValue {
  static identifier = 'com.luckymarmot.PawExtensions.AWSECommerceServiceDynamicValue';
  static title = 'AWS Product Advertising Auth';
  static inputs = [
    DynamicValueInput("secret", "AWS Secret Key", "String")
  ];

  signHmac256(input, key) {
    const dv = DynamicValue("com.luckymarmot.HMACDynamicValue", {
      input: input,
      key: key,
      algorithm: 3 /* = SHA256 */,
      uppercase: false /* keep hashes lowercase */,
      encoding: 'Base64' /* encode hash data in base 64 */,
    })
    return dv.getEvaluatedString()
  }

  getParametersString(request, uri) {
    /* Create the canonicalized query string that you need later in this
     * procedure:
     */
    let params = []

    /* The parameters can come from the GET URI ... */
    const query = uri.query(true)
    for (const key in query) {
      const value = query[key]
      if (key === 'Signature') {
        continue
      }
      params.push([key, value])
    }

    /* or from the POST body (when Content-Type is
     * application/x-www-form-urlencoded). */
    const urlEncodedBody = request.urlEncodedBody
    if (urlEncodedBody) {
      for (const key in urlEncodedBody) {
        const value = urlEncodedBody[key]
        params.push([key, value])
      }
    }

    /* Sort the UTF-8 query string components by parameter name with natural
     * byte ordering. */
    params.sort((a, b) => {
      if (a[0] > b[0]) {
        return 1
      }
      else if (a[0] < b[0]) {
        return -1
      }
      return 0
    })

    /* URL encode the parameter name and values according to the following
     * rules...(see doc for details).
     * Separate the encoded parameter names from their encoded values with the
     * equals sign ( = ) (ASCII character 61), even if the parameter value is
     * empty.
     * Separate the name-value pairs with an ampersand ( & ) (ASCII code 38).
     */
    const stringParams = params.map(pair => {
      return encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1])
    })
    return stringParams.join('&')
  }

  getStringToSign(request) {
    const uri = URI(request.url)

    /* Create the string to sign according to the following pseudo-grammar
     * (the "\n" represents an ASCII newline).
     * 
     * StringToSign = HTTPVerb + "\n" +
     *                ValueOfHostHeaderInLowercase + "\n" +
     *                HTTPRequestURI + "\n" +
     *                CanonicalizedQueryString <from the preceding step>
     * 
     * The HTTPRequestURI component is the HTTP absolute path component of the
     * URI up to, but not including, the query string. If the HTTPRequestURI is
     * empty, use a forward slash ( / ).
     */
    const stringToSign = request.method + "\n" +
                         uri.hostname() + "\n" +
                         uri.pathname() + "\n" +
                         this.getParametersString(request, uri)
    return stringToSign
  }

  evaluate(context) {
    const request = context.getCurrentRequest()
    const stringToSign = this.getStringToSign(request)

    // console.log(stringToSign)
    console.log(this.secret)

    /* Calculate an RFC 2104-compliant HMAC with the string you just created,
     * your AWS secret access key as the key, and SHA256 as the hash algorithm.
     * Convert the resulting value to base64.
     */
    const signature = this.signHmac256(stringToSign, this.secret)

    /* Use the resulting value as the value of the Signature request parameter.
     * The final signature you send in the request must be URL encoded as
     * specified in RFC 3986. If your toolkit URL encodes your final request,
     * then it handles the required URL encoding of the signature. If your
     * toolkit doesn't URL encode the final request, then make sure to URL
     * encode the signature before you include it in the request.
     */
    return encodeURIComponent(signature)
  }
}
