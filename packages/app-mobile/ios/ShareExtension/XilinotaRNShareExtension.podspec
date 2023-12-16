Pod::Spec.new do |spec|
  spec.name         = "XilinotaRNShareExtension"
  spec.version      = "1.0.0"
  spec.summary      = "React Native module for Xilinota to access the data from the share extension."
  spec.description  = "React Native Share Extension module for Xilinota"
  spec.homepage     = "https://github.com/XilinJia/Xilinota"
  spec.license      = { :type => "AGPL-3.0-or-later" }
  spec.author       = { "Duncan Cunningham" => "duncanc4@gmail.com" }
  spec.platform     = :ios, "9.0"
  spec.source       = { :path => "." }
  spec.source_files = "Source/RNShareExtension/**/*.{h,m}"
  spec.dependency     "React"
  spec.dependency     "XilinotaCommonShareExtension"
end
