import AWS from 'aws-sdk'

const s3 = new AWS.S3({
    credentials: {
        accessKeyId: process.env.accessKeyId,
        secretAccessKey: process.env.secretAccessKey
    },
});

export const uploadDoc = (req) => {
    let myFile = req.file.originalname.split(".")
    const fileType = myFile[myFile.length - 1]

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${uuid()}.${fileType}`,
        Body: req.file.buffer
    }
    return new Promise((accept, reject) => {
        try {
            s3.upload(params, (error, data) => {
                if (error) {
                    reject(error)
                }
                accept(data)
            })
        }
        catch (e) {
            reject(e)
        }
    })
}