async function testCF() {
  const accountId = "ca39db7daa60461e79aea309645382a3";
  const token = "cfut_aZoRtkMYGjoeTo8U3BFDQSTrGghYqzC5oSBFl3go3b208fc1";
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "Ultra realistic modern SaaS web application UI mockup of customer management page in dark mode, professional Figma UI design, clean table layout, zero blur, high resolution",
      }),
    }
  );
  
  console.log("Status:", response.status);
  console.log("Content-Type:", response.headers.get("content-type"));
  
  if (response.ok) {
    const jsonOrBlob = await response.json().catch(() => null);
    if (jsonOrBlob) {
      console.log("JSON response keys:", Object.keys(jsonOrBlob));
      if (jsonOrBlob.result && jsonOrBlob.result.image) {
        console.log("Image base64 length:", jsonOrBlob.result.image.length);
      }
    } else {
      console.log("Binary response");
    }
  } else {
    const text = await response.text();
    console.log("Error body:", text);
  }
}

testCF();
