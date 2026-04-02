from langchain_community.document_loaders import PyPDFLoader


loader = PyPDFLoader("./CS_RAG_test.pdf")

pdf = loader.load()

print(pdf)

# for element in pdf_document:
#    print(element)
