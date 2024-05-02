import { useEffect, useState } from 'react';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { app } from '../firebase';
import { ethers } from "ethers";
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { abi, abiLease, contractAddress } from '../constants';

export default function CreateListing() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const params = useParams();
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    imageUrls: [],
    name: '',
    description: '',
    address: '',
    type: 'rent',
    bedrooms: 1,
    bathrooms: 1,
    regularPrice: 50,
    discountPrice: 0,
    offer: false,
    isRented: false,
    parking: false,
    furnished: false,
  });
  const [imageUploadError, setImageUploadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const [contractOK, setContractOK] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [provider, setProvider] = useState(null);
  const [status, setStatus] = useState("");
  const [lease, setLease] = useState();
  const [gotLease, setGotLease] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      const listingId = params.listingId;
      const res = await fetch(`/api/listing/get/${listingId}`);
      const data = await res.json();
      if (data.success === false) {
        console.log(data.message);
        return;
      }
      setFormData(data);
    };

    fetchListing();
  }, []);

  const handleImageSubmit = (e) => {
    if (files.length > 0 && files.length + formData.imageUrls.length < 7) {
      setUploading(true);
      setImageUploadError(false);
      const promises = [];

      for (let i = 0; i < files.length; i++) {
        promises.push(storeImage(files[i]));
      }
      Promise.all(promises)
        .then((urls) => {
          setFormData({
            ...formData,
            imageUrls: formData.imageUrls.concat(urls),
          });
          setImageUploadError(false);
          setUploading(false);
        })
        .catch((err) => {
          setImageUploadError('Image upload failed (2 mb max per image)');
          setUploading(false);
        });
    } else {
      setImageUploadError('You can only upload 6 images per listing');
      setUploading(false);
    }
  };

  const storeImage = async (file) => {
    return new Promise((resolve, reject) => {
      const storage = getStorage(app);
      const fileName = new Date().getTime() + file.name;
      const storageRef = ref(storage, fileName);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          reject(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            resolve(downloadURL);
          });
        }
      );
    });
  };

  async function connectToProvider() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccounts(accounts);
        setProvider(await new ethers.BrowserProvider(window.ethereum));
        console.log(accounts);
      } catch (error) {
        if (error.code === 4001) {
          console.log("User rejected request");
        }
      }
    } else {
      console.log(
        "Ethereum provider not detected. Please install MetaMask or a similar wallet."
      );
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      connectToProvider();
    }
  }, []);

  const getLease = async (leaseId) => {
    if (provider) {
      try {
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const value = await contract.getVault(leaseId);
        setLease(value.toString()); // Convert retrieved value to string
      } catch (error) {
        console.error("Error fetching current value:", error);
      }
    } else {
      console.log("Please connect to a wallet to retrieve value.");
    }
  }

  const setRentedFunc = async () => {
    const contract = new ethers.Contract(lease, abiLease, provider); // Instantiate the contract
    const signer = provider.getSigner(); // Assumes Metamask or similar is injected in the browser
    const contractWithSigner = contract.connect(await signer);

    try {
      const tx = await contractWithSigner.setRented();
      setStatus(" ");
      setStatus("Transaction sent, waiting for confirmation...");
      await tx.wait();
      setStatus("Transaction confirmed!");
      setContractOK(true)

    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.reason);
    }
  };

  const setAvailableFunc = async () => {
    const contract = new ethers.Contract(lease, abiLease, provider); // Instantiate the contract
    const signer = provider.getSigner(); // Assumes Metamask or similar is injected in the browser
    const contractWithSigner = contract.connect(await signer);

    try {
      const tx = await contractWithSigner.setAvailable();
      setStatus(" ");
      setStatus("Transaction sent, waiting for confirmation...");
      await tx.wait();
      setStatus("Transaction confirmed!");
      setContractOK(true);

    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.reason);
    }
  };
  
  const setInactiveFunc = async () => {
    const contract = new ethers.Contract(lease, abiLease, provider); // Instantiate the contract
    const signer = provider.getSigner(); // Assumes Metamask or similar is injected in the browser
    const contractWithSigner = contract.connect(await signer);

    try {
      const tx = await contractWithSigner.setInactive();
      setStatus(" ");
      setStatus("Transaction sent, waiting for confirmation...");
      await tx.wait();
      setStatus("Transaction confirmed!");
      setContractOK(true);

    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.reason);
    }
  };

  const handleLeaseAddress = async (e) => {
    e.preventDefault()

    getLease(formData.contractId)
    if (lease !== undefined) {
      setGotLease(true)
      console.log(lease)
    }
  }

  const handleChangeState = async (e) => {
    e.preventDefault();

    if (formData.isRented === 'rented' && lease !== undefined) {
      setRentedFunc(lease)
    }

    if (formData.isRented === 'available' && lease !== undefined) {
      setAvailableFunc(lease)
    }

    if (formData.isRented === 'inactive' && lease !== undefined) {
      setInactiveFunc(lease)
    }
  }

  const handleRemoveImage = (index) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter((_, i) => i !== index),
    });
  };

  const handleChange = (e) => {
    if (e.target.id === 'sale' || e.target.id === 'rent') {
      setFormData({
        ...formData,
        type: e.target.id,
      });
    }
    if (e.target.id === 'isRented') {
      setFormData({
        ...formData,
        [e.target.id]: e.target.value,
      });
    }
    if (
      e.target.id === 'parking' ||
      e.target.id === 'furnished' ||
      e.target.id === 'offer'
    ) {
      setFormData({
        ...formData,
        [e.target.id]: e.target.checked,
      });
    }

    if (
      e.target.type === 'number' ||
      e.target.type === 'text' ||
      e.target.type === 'textarea'
    ) {
      setFormData({
        ...formData,
        [e.target.id]: e.target.value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.imageUrls.length < 1)
        return setError('You must upload at least one image');
      if (+formData.regularPrice < +formData.discountPrice)
        return setError('Discount price must be lower than regular price');
      setLoading(true);
      setError(false);
      const res = await fetch(`/api/listing/update/${params.listingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userRef: currentUser._id,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success === false) {
        setError(data.message);
      }
      navigate(`/listing/${data._id}`);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleTerminateLease = async (e) => {
    e.preventDefault();


    const terminateLease = async () => {
      const contract = new ethers.Contract(lease, abiLease, provider); // Instantiate the contract
      const signer = provider.getSigner(); // Assumes Metamask or similar is injected in the browser
      const contractWithSigner = contract.connect(await signer);

      try {
        const tx = await contractWithSigner.terminateLease();
        setStatus(" ");
        setStatus("Transaction sent, waiting for confirmation...");
        await tx.wait();
        setStatus("Transaction confirmed!");
        setContractOK(true);

      } catch (err) {
        console.error(err);
        setStatus("Error: " + err.reason);
      }
    };
      await terminateLease()
  }

  return (
    <main className="p-3 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">
        Update a Listing
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-4 flex-1">
          <input
            type="text"
            placeholder="Name"
            className="border p-3 rounded-lg"
            id="name"
            maxLength="62"
            minLength="10"
            required
            onChange={handleChange}
            value={formData.name}
          />
          <textarea
            type="text"
            placeholder="Description"
            className="border p-3 rounded-lg"
            id="description"
            required
            onChange={handleChange}
            value={formData.description}
          />
          <input
            type="text"
            placeholder="Address"
            className="border p-3 rounded-lg"
            id="address"
            required
            onChange={handleChange}
            value={formData.address}
          />
          <div className="flex gap-6 flex-wrap">
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="rent"
                className="w-5"
                onChange={handleChange}
                checked={formData.type === "rent"}
              />
              <span>Rent</span>
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="parking"
                className="w-5"
                onChange={handleChange}
                checked={formData.parking}
              />
              <span>Parking spot</span>
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="furnished"
                className="w-5"
                onChange={handleChange}
                checked={formData.furnished}
              />
              <span>Furnished</span>
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="offer"
                className="w-5"
                onChange={handleChange}
                checked={formData.offer}
              />
              <span>Offer</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="bedrooms"
                min="1"
                max="10"
                required
                className="p-3 border border-gray-300 rounded-lg"
                onChange={handleChange}
                value={formData.bedrooms}
              />
              <p>Beds</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="bathrooms"
                min="1"
                max="10"
                required
                className="p-3 border border-gray-300 rounded-lg"
                onChange={handleChange}
                value={formData.bathrooms}
              />
              <p>Baths</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="regularPrice"
                min="50"
                max="1000000000000000"
                required
                disabled
                className="p-3 border border-gray-300 rounded-lg cursor-not-allowed text-gray-400"
                onChange={handleChange}
                value={formData.regularPrice}
              />
              <div className="flex flex-col items-center">
                <p>Regular price</p>
                {formData.type === "rent" && (
                  <span className="text-xs">(WEI/month)</span>
                )}
              </div>
            </div>
            {formData.offer && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id="discountPrice"
                  min="0"
                  max="10000000"
                  required
                  className="p-3 border border-gray-300 rounded-lg"
                  onChange={handleChange}
                  value={formData.discountPrice}
                />
                <div className="flex flex-col items-center">
                  <p>Discounted price</p>
                  {formData.type === "rent" && (
                    <span className="text-xs">(WEI/month)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <p className="font-semibold">
            Images:
            <span className="font-normal text-gray-600 ml-2">
              The first image will be the cover (max 6)
            </span>
          </p>
          <div className='flex gap-2  items-center'>
            <span className="text-md font-bold"> Status: </span>
            <select
              name="isRented"
              id="isRented"
              value={formData.isRented}
              onChange={handleChange}
              className='border p-3 rounded-md'
            >
              <option value="rented">Rented</option>
              <option value="available">Available</option>
              <option value="inactive">Inactive</option>
            </select>

            {!gotLease && <button
              type='button'
              onClick={handleLeaseAddress}
              className={`p-2 bg-blue-400 text-sm text-white rounded-lg uppercase hover:opacity-95 disabled:opacity-80 ${gotLease && 'cursor-not-allowed'}`}
              disabled={gotLease}
            >
              {gotLease ? "Lease Address Found" : "Get Lease Address"}
            </button>}
            {
              gotLease &&
              <button
              type='button'
              onClick={handleChangeState}
              className={`p-2 bg-blue-400 text-white rounded-lg uppercase hover:opacity-95 disabled:opacity-80`}
            >
              {gotLease && `Set Lease to ${formData.isRented}`}
              </button>
            }
          </div>
            
          {status && status}
          <div className="flex gap-4">
            <input
              onChange={(e) => setFiles(e.target.files)}
              className="p-3 border border-gray-300 rounded w-full"
              type="file"
              id="images"
              accept="image/*"
              multiple
            />
            <button
              type="button"
              disabled={uploading}
              onClick={handleImageSubmit}
              className="p-3 text-green-700 border border-green-700 rounded uppercase hover:shadow-lg disabled:opacity-80"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          <p className="text-red-700 text-sm">
            {imageUploadError && imageUploadError}
          </p>
          {formData.imageUrls.length > 0 &&
            formData.imageUrls.map((url, index) => (
              <div
                key={url}
                className="flex justify-between p-3 border items-center"
              >
                <img
                  src={url}
                  alt="listing image"
                  className="w-20 h-20 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="p-3 text-red-700 rounded-lg uppercase hover:opacity-75"
                >
                  Delete
                </button>
              </div>
            ))}
          {
            formData.isRented === 'rented' && (
              <button
                type='button'
                className="p-3 bg-blue-400 text-white rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
                onClick={handleTerminateLease}
              >
                Terminate Lease
              </button>
            )
          }
          {contractOK && <button
            type='submit'
            disabled={loading || uploading}
            className="p-3 bg-blue-400 text-white rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
          >
            {loading ? "Updating..." : "Update listing"}
          </button>}
          {error && <p className="text-red-700 text-sm">{error}</p>}
        </div>
      </form>
    </main>
  );
}
